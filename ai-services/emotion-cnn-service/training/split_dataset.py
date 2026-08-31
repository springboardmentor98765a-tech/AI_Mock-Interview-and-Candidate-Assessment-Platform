"""Create a reproducible 70/15/15 train/validation/test split.

Input:
  raw dataset with exact class folders:
    raw/Nervous, raw/Scared, raw/Confused
Output:
  dataset/train/<class>, dataset/val/<class>, dataset/test/<class>

No label remapping is performed.
"""
from pathlib import Path
import argparse, random, shutil

CLASSES = ["Nervous", "Scared", "Confused"]
IMG_EXTS = {".jpg", ".jpeg", ".png", ".webp"}


def main():
    p=argparse.ArgumentParser()
    p.add_argument("--raw", default="../raw-data")
    p.add_argument("--out", default="../dataset")
    p.add_argument("--seed", type=int, default=42)
    args=p.parse_args()
    raw=Path(args.raw).resolve(); out=Path(args.out).resolve()
    rng=random.Random(args.seed)
    for cls in CLASSES:
        files=[f for f in (raw/cls).glob("*") if f.is_file() and f.suffix.lower() in IMG_EXTS]
        if len(files) < 30:
            raise SystemExit(f"{cls}: need at least 30 genuine labeled images for a meaningful split; found {len(files)}")
        rng.shuffle(files)
        n=len(files); n_train=int(n*0.70); n_val=int(n*0.15)
        groups={"train":files[:n_train],"val":files[n_train:n_train+n_val],"test":files[n_train+n_val:]}
        for split, items in groups.items():
            dest=out/split/cls; dest.mkdir(parents=True, exist_ok=True)
            for src in items:
                shutil.copy2(src, dest/src.name)
        print(f"{cls}: {len(files)} -> train={len(groups['train'])}, val={len(groups['val'])}, test={len(groups['test'])}")

if __name__ == "__main__": main()
