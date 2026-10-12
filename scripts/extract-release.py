"""Extract a GitHub CI artifact without trusting archive paths or metadata."""
import pathlib
import stat
import sys
import zipfile

archive, output = map(pathlib.Path, sys.argv[1:])
if output.exists():
    raise ValueError("Use a fresh extraction directory")
with zipfile.ZipFile(archive) as package:
    entries = package.infolist()
    if len(entries) > 5000 or sum(e.file_size for e in entries) > 200 * 1024 * 1024:
        raise ValueError("Archive exceeds safety limits")
    names = set()
    for entry in entries:
        path = pathlib.PurePosixPath(entry.filename)
        if (path.is_absolute() or "\\" in entry.filename or any(p in (".", "..") for p in entry.filename.split("/"))
                or entry.filename in names or stat.S_ISLNK(entry.external_attr >> 16)
                or not (entry.filename == "release.json" or entry.filename.startswith("public/"))):
            raise ValueError("Unexpected or unsafe artifact entry")
        names.add(entry.filename)
    output.mkdir(mode=0o700, parents=True)
    package.extractall(output)
