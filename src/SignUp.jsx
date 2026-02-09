import React, { useState } from 'react';
// Assuming these assets are located in your src folder or assets folder
import CognizantLogo from './assets/logo.svg'; 
import BgImage from './assets/background.jpg'; 
import { Link, useNavigate } from 'react-router-dom'; 


/**
 * React Component for the Sign Up Page
 * @returns {JSX.Element} The rendered Sign Up component
 */
const SignUp = () => {
    // State for form inputs
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
     const [message, setMessage] = useState(null); // State for success/error messages
    const [messageCategory, setMessageCategory] = useState(null); // State for message category (e.g., 'success', 'error')
    const [country, setCountry] = useState('Canada'); // Default selection
    
    const countryOptions = [
        'Canada', 
        'India', 
        'United States', 
        'North America'
    ];

     const navigate = useNavigate();
    // The URL of your Flask backend
    const API_URL = 'http://127.0.0.1:5000/api/register'; 

    // Handle form submission (client-side)
    const handleSubmit = async (e) => {
        e.preventDefault();
         // Clear previous messages
        setMessage(null);
        setMessageCategory(null);
        // In a real application, you would send a POST request to your backend here
        console.log('Attempting sign up with:', { name, username, password, country });
         // Data to be sent to the Flask backend
        const formData = { 
            name, 
            username, 
            password,
            country 
        };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    // Important: Tell Flask that we are sending JSON
                    'Content-Type': 'application/json', 
                },
                // Convert JavaScript object to JSON string
                body: JSON.stringify(formData), 
            });

            // Parse the JSON response body
            const data = await response.json();

            if (response.ok) { // HTTP status 200-299 indicates success (e.g., 201 Created)
                setMessage('Registration successful! Redirecting to sign in...');
                setMessageCategory('success');
                // Optional: Automatically navigate to the sign-in page after a delay
                setTimeout(() => {
                    navigate('/signin');
                }, 2000); 
            } else { 
                // HTTP status is 4xx (e.g., 400 Bad Request for validation errors)
                // The 'message' field in the JSON response contains the error string
                setMessage(data.message || 'Registration failed due to an unexpected error.');
                setMessageCategory('error');
            }

        } catch (error) {
            console.error('Network or server error:', error);
            setMessage('Could not connect to the server. Please check if the backend is running.');
            setMessageCategory('error');
        }
    };

    return (
        <div className="container">
            {/* Left Panel - Contains Logo and Form */}
            <div className="left-panel">
                <div className="logo">
                    {/* Replaced Flask url_for with direct React asset import */}
                    <img src={CognizantLogo} alt="Cognizant Logo" className="logo-img" />
                    <br />
                    <br />
                </div>

                <div className="form-container">
                    {/* Flash Messages Display (Static placeholder implementation) */}
                    {message && (
                        <ul className="flashes">
                            {/* The category is used for styling (e.g., a CSS class) */}
                            <li className={messageCategory}>{message}</li> 
                        </ul>
                    )}
                    {/* End Flash Messages Display */}

                    {/* Replaced Flask action with a client-side onSubmit handler */}
                    <form onSubmit={handleSubmit} method="POST"> 
                        <div className="input-group">
                            <label htmlFor="name">Name</label>
                            <input 
                                type="text" 
                                id="name" 
                                name="name" 
                                placeholder="John Doe" 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required 
                            />
                        </div>

                        <div className="input-group">
                            <label htmlFor="username">Username</label>
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

                        <button type="submit" className="signup-btn">
                            Sign Up
                        </button>
                    </form>

                    <div className="login-link">
                        Have an account? 
                        {/* Replaced Flask url_for with a React Router Link component */}
                        <Link to="/signin">Sign in</Link> 
                    </div>
                </div>
            </div>

            {/* Right Panel - Add content like an image here if needed */}
            <div className="right-panel">
                <img src={BgImage} alt="Background Logo" className="right-bg-image" />
            </div>
        </div>
    );
};

export default SignUp;