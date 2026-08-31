# Module 6 Dataset Provenance

## Required classes

The assignment requires exactly three face-expression classes:

- Nervous
- Scared
- Confused

The project does **not** rename unrelated labels into these categories.

## Public research references

The McGill Face Database is a validated database of complex mental-state facial expressions. Its published materials include labels such as **Confused** and **Nervous** and the database is distributed for scientific/non-commercial research under its stated access conditions. Because the maintainers gate access, this repository does not redistribute its images.

The CVPR 2023 **How You Feelin'? / MovieGraphs** work reports a free-text emotional/mental-state label vocabulary containing **nervous, scared, and confused**. It is a movie-scene dataset rather than a ready-made 3-class face-crop dataset, so the project does not silently treat scene labels as face labels.

## Exact 3-class training data used by this application

For an exact, auditable 3-class CNN, use genuinely annotated face images in:

```
raw-data/Nervous/
raw-data/Scared/
raw-data/Confused/
```

The included `collect_dataset.py` creates a **consent-based custom dataset** from webcam face crops. This is the recommended route when the exact labels are not available in a public facial-image dataset under compatible terms.

After collection, run `split_dataset.py` to create a reproducible 70/15/15 train/validation/test split, then run `train.py`.

Do not copy public images into a different label simply to satisfy the class name.
