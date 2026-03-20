import { useDispatch, useSelector } from "react-redux";
import { Link, Outlet } from "react-router-dom";
import { logout } from "../slices/authSlice";

export const Navbar = () => {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();

  function handleLogout() {
    dispatch(logout());
  }

  return (
    <div>
      <div className="p-4 bg-blue-400 flex flex-row justify-between">
        <div>
          <Link to="/lobby">Lobby</Link>
        </div>
        <div>
          {user ? (
            <button onClick={handleLogout}>Logout</button>
          ) : (
            <div className="flex flex-row gap-4">
              <Link to="/login">Login</Link>
              <Link to="/signup">Signup</Link>
            </div>
          )}
        </div>
      </div>
      <div className="p-4">
        <Outlet />
      </div>
    </div>
  );
};