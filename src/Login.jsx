import React, { useState } from 'react';
import CognizantLogo from './assets/logo.svg'; 
import BgImage from './assets/background.jpg'; 
import { Link, useNavigate } from 'react-router-dom';
import './style.css'; 


/**
 * React Component for the Sign In Page
 * @returns {JSX.Element} The rendered Sign In component
 */
const Login = () => {
  // State for form inputs (optional, but good practice in React)
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
    const [country, setCountry] = useState('Canada'); // Default selection
    const [message, setMessage] = useState(''); // To show API feedback
    const [messageCategory, setMessageCategory] = useState(''); // success or error
    
    const navigate = useNavigate(); // Hook for navigation

      const countryOptions = [
        'Canada', 
        'India', 
        'United States', 
        'North America'
    ];

  // Handle form submission (client-side)
  const handleSubmit = async (e) => {
    e.preventDefault();

     if (!username || !password || !country) {
            setMessage('Error: All three fields (Username, Password, and Country) are mandatory.');
      setMessageCategory('error');
            return; // Stop the submission
        }

     const payload = {
            username: username,
            password: password,
            country: country // Include the new state value
        };
    setMessage('Submitting data...');
     setMessageCategory(''); // Clear previous message category
   
  try {
        // 1. Send the POST request to the Flask backend
        const response = await fetch('http://localhost:5000/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        // 2. Parse the JSON response
        const data = await response.json();

        if (response.ok) {
            // HTTP status 200 means successful login
            setMessage('Login successful! Redirecting...');
            setMessageCategory('success');
            console.log('User Data:', data.user);
            
            // NOTE: Here you would typically store the user data/token 
            // (e.g., in localStorage or a Redux store) and then redirect.
            
            // Example redirection (e.g., to a dashboard page)
            setTimeout(() => {
                navigate('/dashboard'); // Make sure you have a /dashboard route defined
            }, 1500);

        } else {
            // HTTP status 401 or 400
            setMessage(data.message || 'Login failed due to an unknown error.');
            setMessageCategory('error');
        }
    } catch (error) {
        console.error('Fetch error:', error);
        setMessage('Network error: Could not connect to the server (Is the Python backend running on port 5000?).');
        setMessageCategory('error');
    }
  };


  return (
    // Note: React requires a single root element (the 'container' div)
    <div className="container">
      {/* Left Panel - Contains Logo and Form */}
      <div className="left-panel">
        <div className="logo">
         <img src={CognizantLogo} alt="Cognizant Logo" className="logo-img" />
          <br />
          <br />
        </div>

        <div className="form-container">
          {/* Flash Messages Display (Static placeholder implementation) */}
          {/* {staticFlashedMessages.length > 0 && (
            <ul className="flashes">
              {staticFlashedMessages.map((msg, index) => (
                <li key={index} className={msg.category}>
                  {msg.message}
                </li>
              ))}
            </ul>
          )} */}
          {message && (
            // Use the messageCategory state to apply a class (e.g., 'success' or 'error')
            <div className={`flashes ${messageCategory}`}>
              {message}
            </div>
          )}
          {/* End Flash Messages Display */}

          {/* Replaced Flask action with a client-side onSubmit handler */}
          <form onSubmit={handleSubmit} method="POST">
            <div className="input-group">
              <label htmlFor="username">Username</label>
              {/* Added state management for input fields */}
              <input 
                type="text" 
                id="username" 
                name="username" 
                placeholder="johndoe123" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required 
              />
            </div>
            
            <div className="input-group">
              <label htmlFor="password">Password</label>
              {/* Added state management for input fields */}
              <input 
                type="password" 
                id="password" 
                name="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>

            {/* NEW Country Dropdown */}
            <div className="input-group">
                <label htmlFor="country">Country</label>
                <select
                    id="country"
                    name="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    required
                >
                    {countryOptions.map((option) => (
                        <option key={option} value={option}>
                            {option}
                        </option>
                    ))}
                </select>
            </div>

            <button type="submit" className="signin-btn">
              Sign In
            </button>
          </form>

          <div className="login-link">
            Don't have an account? 
          <Link to="/signup">Sign Up</Link>
            {/* <a href="/signup">Sign Up</a> */}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="right-panel">
        {/* Potentially an image or other promotional content */}
         <img src={BgImage} alt="Background Logo" className="right-bg-image" />
      </div>
    </div>
  );
};

export default Login;