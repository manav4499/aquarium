import React, { useState, useContext, useEffect} from 'react';
import { useNavigate } from "react-router-dom";
import { FaUser, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { ThemeContext } from "../ColorTheme";
import { UserContext } from '../UserContext';
import * as styles from "./login.module.css";


export default function Login() {
  //useState to store the username and password
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { theme } = useContext(ThemeContext);
  const [loading, setLoading] = useState(true);
  const { login } = useContext(UserContext);


  //function to check if the user is already logged in
  const handleLogin = async (e) => {
    e.preventDefault();
    const result = await login(username, password);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
  }; 

  return (
    <div className={`${styles.loginContainer} ${styles[theme]}`}>
      <div className={styles.loginCard}>
        <h1 className={styles.title}>Welcome Back</h1>
        {error && <p className={styles.error}>{error}</p>}

        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.inputGroup}>
            <FaUser className={styles.icon} />
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.inputGroup}>
            <FaLock className={styles.icon} />
            <input
            //ternary operator to check if the showPassword is true or false
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={styles.input}
            />
            <button
              type="button"
              className={styles.showPassword}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          <button type="submit" className={styles.loginButton}>
            Log In
          </button>
        </form>

        <div className={styles.divider}>
          <p className={styles.or}>or</p>
        </div>

        <p className={styles.signupPrompt}>
          Don't have an account?{" "}
          <span onClick={() => navigate("/signup")}>Sign up</span>
        </p>
      </div>
    </div>
  );
}
