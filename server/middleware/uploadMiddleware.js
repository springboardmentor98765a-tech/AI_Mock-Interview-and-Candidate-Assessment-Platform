import multer from "multer";
import path from "path";
import fs from "fs";

// ============================================
// RECORDING DIRECTORY
// ============================================

const recordingDirectory = path.join(
    process.cwd(),
    "recordings"
);

if (!fs.existsSync(recordingDirectory)) {

    fs.mkdirSync(
        recordingDirectory,
        {
            recursive: true
        }
    );

}


// ============================================
// MULTER STORAGE
// ============================================

const storage = multer.diskStorage({

    destination: (req, file, cb) => {

        cb(
            null,
            recordingDirectory
        );

    },

    filename: (req, file, cb) => {

        const extension =
            path.extname(
                file.originalname
            ) || ".webm";

        const uniqueName =
            `recording-${Date.now()}${extension}`;

        cb(
            null,
            uniqueName
        );

    }

});


// ============================================
// FILE FILTER
// ============================================

const fileFilter = (
    req,
    file,
    cb
) => {

    console.log(
        "Uploaded MIME type:",
        file.mimetype
    );


    /*
       MediaRecorder can send MIME types such as:

       video/webm
       video/webm;codecs=vp8,opus
       audio/webm
       audio/webm;codecs=opus
       video/mp4
       audio/mp4

       Therefore we check the beginning of
       the MIME type instead of exact matching.
    */

    const mimeType =
        file.mimetype.toLowerCase();


    if (
        mimeType.startsWith("video/") ||
        mimeType.startsWith("audio/")
    ) {

        cb(
            null,
            true
        );

    }

    else {

        console.log(
            "Rejected MIME type:",
            file.mimetype
        );

        cb(
            new Error(
                "Only audio/video recordings are allowed"
            )
        );

    }

};


// ============================================
// MULTER UPLOAD
// ============================================

const upload = multer({

    storage,

    fileFilter,

    limits: {

        fileSize:
            100 * 1024 * 1024

    }

});


export default upload;