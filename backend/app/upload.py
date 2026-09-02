"""Image upload validation and local-filesystem storage.

Responsibilities:

* enforce the upload size limit *before* the request body is buffered, by
  inspecting the ``Content-Length`` header and refusing (413) when it already
  exceeds the configured maximum;
* validate the uploaded image type — JPEG, PNG and WebP only (400 otherwise);
* store images under ``UPLOAD_DIR/<user_id>/<item_id>.<ext>`` with a canonical,
  server-chosen filename (never the client-supplied name);
* stream the file to disk in chunks and abort (413) once it exceeds the limit,
  removing the partial file;
* delete an old file when an item is deleted or its image is replaced.
"""

from pathlib import Path

from fastapi import HTTPException, Request, UploadFile, status

from app.config import settings

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
CONTENT_TYPE_TO_EXTENSION = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

_CHUNK_SIZE = 1024 * 1024


def max_upload_bytes() -> int:
    """Return the configured upload limit in bytes."""
    return settings.max_upload_mb * 1024 * 1024


def _too_large() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_413_CONTENT_TOO_LARGE,
        detail=f"Bild zu groß: maximal {settings.max_upload_mb} MB erlaubt.",
    )


def _content_type(content_type: str | None) -> str:
    return (content_type or "").split(";", 1)[0].strip().lower()


def enforce_upload_size_limit(request: Request) -> None:
    """Reject an oversized request from the ``Content-Length`` header alone.

    Called before the multipart body is parsed so that an oversized upload is
    refused with 413 without buffering the entire request body. A missing or
    non-numeric header is left to the per-file check performed during saving.
    """
    content_length = request.headers.get("content-length")
    if content_length is None:
        return
    try:
        length = int(content_length)
    except ValueError:
        return
    if length > max_upload_bytes():
        raise _too_large()


def validate_image(image: UploadFile) -> str:
    """Validate the uploaded image and return its canonical file extension.

    Raises 400 for an unsupported content type or file extension. The extension
    is derived from the declared content type (falling back to the filename),
    never from the client-supplied filename alone for the stored path.
    """
    content_type = _content_type(image.content_type)
    extension = Path(image.filename or "").suffix.lower()

    if content_type and content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ungültiger Bildtyp: erlaubt sind JPEG, PNG und WebP.",
        )
    if extension and extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ungültige Bilddatei: erlaubt sind .jpg, .png und .webp.",
        )

    resolved = CONTENT_TYPE_TO_EXTENSION.get(content_type) or extension
    if resolved not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bildtyp konnte nicht erkannt werden: erlaubt sind JPEG, PNG und WebP.",
        )
    return resolved


def save_image(image: UploadFile, user_id: int, item_id: int, extension: str) -> str:
    """Stream ``image`` to disk and return its relative path.

    The file is written in chunks and rejected (413) as soon as it exceeds the
    configured limit; any partial file is removed so a failed upload leaves no
    trace on disk.
    """
    relative_path = f"{user_id}/{item_id}{extension}"
    target = Path(settings.upload_dir) / relative_path
    target.parent.mkdir(parents=True, exist_ok=True)

    limit = max_upload_bytes()
    written = 0
    try:
        image.file.seek(0)
        with target.open("wb") as out:
            while True:
                chunk = image.file.read(_CHUNK_SIZE)
                if not chunk:
                    break
                written += len(chunk)
                if written > limit:
                    raise _too_large()
                out.write(chunk)
    except Exception:
        target.unlink(missing_ok=True)
        raise
    return relative_path


def delete_image(relative_path: str | None) -> None:
    """Delete a stored image file, ignoring a missing or empty path."""
    if not relative_path:
        return
    Path(settings.upload_dir, relative_path).unlink(missing_ok=True)


def build_image_url(item_id: int) -> str:
    """Return the relative image URL for an item."""
    return f"/api/items/{item_id}/image"
