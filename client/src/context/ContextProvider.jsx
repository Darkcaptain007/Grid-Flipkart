import { createContext, useState, useEffect } from 'react';

export const LoginContext = createContext(null);

const ContextProvider = ({ children }) => {
  const [account, setAccount] = useState(null); // Start as null

  // UPDATED: Load from localStorage on mount with error handling
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser); // Expecting a JSON object
        setAccount(parsedUser.username); // Extract username
        console.log('Restored user from localStorage:', parsedUser.username); // Debug log
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('user'); // Clear invalid data
        setAccount(null);
      }
    }
  }, []);

  // Expose a logout function to clear storage
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAccount(null);
  };

  return (
    <LoginContext.Provider value={{ account, setAccount, logout }}>
      {children}
    </LoginContext.Provider>
  );
};

export default ContextProvider;
