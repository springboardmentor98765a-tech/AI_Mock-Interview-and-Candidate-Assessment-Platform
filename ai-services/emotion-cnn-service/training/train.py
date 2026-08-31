"""Train and evaluate the SmartHire custom 3-class CNN.

Expected split dataset:
  dataset/train/Nervous, Scared, Confused
  dataset/val/Nervous, Scared, Confused
  dataset/test/Nervous, Scared, Confused

No other emotion is renamed into these classes.
"""
from pathlib import Path
import argparse, json
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers

CLASSES=["Nervous","Scared","Confused"]
IMG_SIZE=(96,96); BATCH=32; SEED=42

def ds(path, shuffle):
    return keras.utils.image_dataset_from_directory(path, class_names=CLASSES, label_mode="categorical", image_size=IMG_SIZE, batch_size=BATCH, shuffle=shuffle, seed=SEED)

def build_model():
    inp=keras.Input(shape=(*IMG_SIZE,3), name="face_image")
    x=layers.Rescaling(1./255, name="normalize")(inp)
    x=layers.Conv2D(32,3,padding="same")(x); x=layers.ReLU()(x); x=layers.MaxPooling2D()(x)
    x=layers.Conv2D(64,3,padding="same")(x); x=layers.ReLU()(x); x=layers.MaxPooling2D()(x)
    x=layers.Conv2D(128,3,padding="same")(x); x=layers.ReLU()(x); x=layers.MaxPooling2D()(x)
    x=layers.Flatten()(x); x=layers.Dropout(0.35)(x); x=layers.Dense(128,activation="relu")(x)
    out=layers.Dense(3,activation="softmax",name="emotion_probability")(x)
    m=keras.Model(inp,out,name="SmartHireEmotionCNN")
    m.compile(optimizer=keras.optimizers.Adam(1e-3),loss="categorical_crossentropy",metrics=["accuracy"])
    return m

def main():
    p=argparse.ArgumentParser(); p.add_argument("--data",default="../dataset"); p.add_argument("--output",default="../model/emotion_cnn.keras"); p.add_argument("--epochs",type=int,default=25)
    a=p.parse_args(); root=Path(a.data).resolve(); output=Path(a.output).resolve()
    for split in ["train","val","test"]:
        for c in CLASSES:
            if not (root/split/c).exists(): raise SystemExit(f"Missing {root/split/c}. Run split_dataset.py first.")
    train=ds(root/"train",True).prefetch(tf.data.AUTOTUNE)
    val=ds(root/"val",False).prefetch(tf.data.AUTOTUNE)
    test=ds(root/"test",False).prefetch(tf.data.AUTOTUNE)
    model=build_model(); output.parent.mkdir(parents=True,exist_ok=True)
    cb=[keras.callbacks.EarlyStopping(monitor="val_accuracy",patience=6,restore_best_weights=True),keras.callbacks.ModelCheckpoint(output,monitor="val_accuracy",save_best_only=True),keras.callbacks.ReduceLROnPlateau(monitor="val_loss",factor=.5,patience=3,min_lr=1e-5)]
    hist=model.fit(train,validation_data=val,epochs=a.epochs,callbacks=cb)
    test_loss,test_acc=model.evaluate(test,verbose=0)
    meta={"classes":CLASSES,"image_size":IMG_SIZE,"architecture":["Conv2D","ReLU","MaxPooling2D","Conv2D","ReLU","MaxPooling2D","Conv2D","ReLU","MaxPooling2D","Flatten","Dense","Softmax"],"best_validation_accuracy":float(max(hist.history.get("val_accuracy",[0]))),"test_accuracy":float(test_acc),"test_loss":float(test_loss)}
    (output.parent/"training_metadata.json").write_text(json.dumps(meta,indent=2))
    print(json.dumps(meta,indent=2))

if __name__=="__main__": main()
