export default function AdminRoute({ children, setPage }) {
    const token = localStorage.getItem("token");
    let user = null;
    try {
        const stored = localStorage.getItem("user");
        if (stored) {
            const parsed = JSON.parse(stored);
            user = parsed?.user ?? parsed?.userData ?? parsed;
        }
    } catch (e) {}
    if (!token || !user || user?.user_type !== "admin") {
        if (typeof setPage === "function") setPage("login");
        return null;
    }
    return children;
}