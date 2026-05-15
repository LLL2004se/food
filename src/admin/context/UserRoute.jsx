export function UserRoute({ children, setPage }) {
    const token = localStorage.getItem("token");
    if (!token && typeof setPage === "function") {
        setPage("login");
        return null;
    }
    if (!token) return null;
    return children;
}