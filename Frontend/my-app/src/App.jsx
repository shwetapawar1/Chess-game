import { Routes, Route } from "react-router-dom";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { Lobby } from "./pages/Lobby";
import { Navbar } from "./component/Navbar"
import { ProtectedRoutes } from "./component/ProtectedRoute";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { fetchMe } from "./slices/authSlice";
import { Room } from "./pages/Room";

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchMe());
  }, [dispatch]);

  return (
    <Routes>
      <Route element={<Navbar />}>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route element={<ProtectedRoutes />}>
          <Route path="/lobby" element={<Lobby />} />
          <Route path="/rooms/:roomCode" element={<Room />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;