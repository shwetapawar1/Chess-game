import { useDispatch } from "react-redux";
import { fetchMe, login } from "../slices/authSlice";
import { useNavigate } from "react-router-dom";

export const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get("email");
    const password = formData.get("password");
    // dispatch(login({ email, password }));
    try {
      await dispatch(login({ email, password })).unwrap();
      await dispatch(fetchMe()).unwrap();
      // notification using notistack
      // redirect to the /lobby page
      navigate("/lobby");
    } catch (err) {
      // do something
      console.log(err);
    }
  }

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="p-10 border border-black rounded">
        <form onSubmit={handleSubmit} className="flex flex-col gap-10">
          <label>
            Email
            <input
              className="ml-12 border rounded p-1"
              type="text"
              name="email"
              placeholder="Enter email"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              placeholder="Enter password"
              className="ml-4 border rounded p-1"
            />
          </label>
          <button type="submit" className="border rounded">
            Login
          </button>
        </form>
      </div>
    </div>
  );
};