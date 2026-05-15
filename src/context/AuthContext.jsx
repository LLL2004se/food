import { useState, useEffect, createContext, useContext } from "react";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }) {
    const [auth, setAuth] = useState({ isLoggedIn: false, user: null });

    useEffect(() => {
        const stored = localStorage.getItem("user");
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                const user = parsed?.user ?? parsed?.userData ?? parsed;
                const isLoggedIn = !!localStorage.getItem("token") && !!user;
                setAuth({ isLoggedIn, user: user || null });
            } catch (e) {
                setAuth({ isLoggedIn: false, user: null });
            }
        }
    }, []);

    const login = (userData, token) => {
        if (token) localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify({ isLoggedIn: true, user: userData }));
        setAuth({ isLoggedIn: true, user: userData });
    };

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setAuth({ isLoggedIn: false, user: null });
    };

    return (
        <AuthContext.Provider value={{ auth, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}