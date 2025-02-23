import './Home.css';

export const Home = () => {
    return (
        <div className="home-container">
            <nav>
                <ul>
                    <li><a href="/login">Login</a></li>
                    <li><a href="/signup">Sign In</a></li>
                </ul>
            </nav>
            <div>
                Home Page!!
            </div>
        </div>
    )
}