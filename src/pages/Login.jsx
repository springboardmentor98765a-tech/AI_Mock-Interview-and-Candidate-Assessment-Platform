import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Login.css";

function Login() {

  const [role, setRole] = useState("candidate");
  const navigate = useNavigate();
  const handleLogin = () => {

    if(role === "candidate"){

        navigate("/candidate");

    }

    else if(role === "recruiter"){

        navigate("/recruiter");

    }

    else{

        navigate("/admin");

    }

};

  return (
    <div className="login-container">

      <div className="login-box">

        <h1>SmartHire AI</h1>

        <p>Welcome Back</p>

        <input
          type="email"
          placeholder="Enter Email"
        />

        <input
          type="password"
          placeholder="Enter Password"
        />

        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="candidate">Candidate</option>
          <option value="recruiter">Recruiter</option>
          <option value="admin">Admin</option>
        </select>

        <button onClick={handleLogin}>
    Login
</button>

        <hr />

        <button>
          Continue with Google
        </button>

        <button>
          Continue with GitHub
        </button>

      </div>

    </div>
  );
}

export default Login;