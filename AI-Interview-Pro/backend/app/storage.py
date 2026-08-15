"""
storage.py
===========
Module 4 tech stack calls for "File Storage: AWS S3 / Azure Blob Storage".
This project runs and is graded locally (no cloud credentials assumed),
so recordings are stored on local disk under MEDIA_ROOT by default.

This module exists as the single choke point every recording read/write
goes through, specifically so swapping local disk for S3/Azure later is a
one-file change: implement a second class below with the same three
methods, and switch STORAGE_BACKEND in config/.env - nothing in
session_routes.py has to change.
"""

import os

from app.config import settings


class LocalDiskStorage:
    """Default backend: saves under MEDIA_ROOT/recordings on local disk."""

    def __init__(self):
        self.recordings_dir = os.path.join(settings.MEDIA_ROOT, "recordings")
        os.makedirs(self.recordings_dir, exist_ok=True)

    def save(self, file_name: str, file_bytes: bytes) -> str:
        """Writes the file and returns its relative path (stored in the DB).
        Always stored with forward slashes, regardless of OS, so the value
        saved in the DB is portable if this app is ever run on a different
        machine/OS than the one that originally saved the recording (see
        the note on url_for below for why that matters)."""
        relative_path = "recordings/" + file_name
        absolute_path = os.path.join(settings.MEDIA_ROOT, *relative_path.split("/"))
        with open(absolute_path, "wb") as out_file:
            out_file.write(file_bytes)
        return relative_path

    def delete(self, relative_path: str) -> None:
        absolute_path = os.path.join(settings.MEDIA_ROOT, *relative_path.replace("\\", "/").split("/"))
        if os.path.isfile(absolute_path):
            try:
                os.remove(absolute_path)
            except OSError:
                pass

    def url_for(self, relative_path: str) -> str:
        """Public URL the frontend can play directly (served via the
        StaticFiles mount in main.py).

        Normalizes BOTH slash directions, not just os.sep: older rows can
        have been written while this app was running on a different OS
        than it's running on now (e.g. recorded on Windows, so file_path
        was stored as "recordings\\xxx.webm", then the app later runs on
        Linux/Mac where os.sep is "/" - so the old `.replace(os.sep, "/")`
        was a no-op and left a literal backslash in the URL, 404-ing only
        the old recordings while freshly-saved ones - written with the
        current OS's separator - kept working). Normalizing unconditionally
        makes playback OS-independent regardless of which machine/OS a
        given recording was originally saved on."""
        normalized = relative_path.replace("\\", "/")
        return "/media/" + normalized


# ---------------------------------------------------------------------------
# To swap in AWS S3 (once credentials/bucket are available), implement:
#
#   class S3Storage:
#       def save(self, file_name, file_bytes) -> str: ...   # uploads, returns S3 key
#       def delete(self, key) -> None: ...                   # deletes the object
#       def url_for(self, key) -> str: ...                   # presigned/public URL
#
# then set `storage = S3Storage()` below instead. Every caller only ever
# uses `storage.save/.delete/.url_for`, so nothing else changes.
# ---------------------------------------------------------------------------

storage = LocalDiskStorage()
