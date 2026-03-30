import { useState } from "react";

export const Profile = () => {

const[file, setFile] = useState();

const handleFile = (e) => {
   e.preventDefault();

    const formData = new FormData();
    formData.append("file", file);
    api.post("/uploads", formData);

}

     
    return(
    <div>
        <form  onSubmit={handleFile}>
        <lable className="mr-2">Upload profile Picture</lable>
        <input value={file} onChange={(e) => setFile(e.target.files[0])} type="file" />
        <button className="border flex m-2"type="submit">Submit</button>
        </form>
    </div>
    )
}