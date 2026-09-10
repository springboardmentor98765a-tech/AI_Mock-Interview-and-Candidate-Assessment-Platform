import multer from "multer";
import path from "path";
import fs from "fs";

const resumeDirectory = path.join(
    process.cwd(),
    "resumes"
);

if (!fs.existsSync(resumeDirectory)) {
    fs.mkdirSync(resumeDirectory, {
        recursive: true
    });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, resumeDirectory);
    },

    filename: (req, file, cb) => {
        const extension =
            path.extname(file.originalname) || ".pdf";

        const uniqueName =
            `resume-${Date.now()}${extension}`;

        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
        cb(null, true);
    } else {
        cb(
            new Error("Only PDF resumes are allowed")
        );
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024
    }
});

export default upload;