import { Link } from "react-router-dom";
import "../styles/Navbar.css";

function Navbar() {
  return (
    <nav className="navbar">

      <div className="logo">
        SmartHire AI
      </div>

      <ul className="nav-links">

  <li>
    <Link to="/">Home</Link>
  </li>

  <li>
    <Link to="/login">Login</Link>
  </li>

</ul>

    </nav>
  );
}

export default Navbar;