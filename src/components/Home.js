import React, { useEffect } from 'react';
import './Home.css';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faLaptopCode, 
  faUserGraduate, 
  faBriefcase, 
  faChartLine, 
  faHandshake, 
  faArrowRight,
  faCode,
  faLightbulb,
  faUsers
} from '@fortawesome/free-solid-svg-icons';

export const Home = () => {
    const navigate = useNavigate();

    useEffect(() => {
        // Intersection Observer for fade-in animations
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('show');
                }
            });
        }, { threshold: 0.1 });

        // Observe all elements with the 'fade-in' class
        document.querySelectorAll('.fade-in').forEach(el => {
            observer.observe(el);
        });

        return () => {
            // Clean up
            document.querySelectorAll('.fade-in').forEach(el => {
                observer.unobserve(el);
            });
        };
    }, []);

    return (
        <div className="home-container">
            <header className="header">
                <div className="logo">Schulen</div>
                <nav>
                    <ul>
                        <li><a href="#features">Features</a></li>
                        <li><a href="#benefits">Benefits</a></li>
                        <li><a href="#testimonials">Success Stories</a></li>
                        <li><button onClick={() => navigate('/login')} className="login-btn">Login</button></li>
                        <li><button onClick={() => navigate('/signup')} className="signup-btn">Sign Up</button></li>
                    </ul>
                </nav>
            </header>

            <section className="hero">
                <div className="hero-content">
                    <h1 className="fade-in">Real Projects. Real Experience. Real Opportunities.</h1>
                    <p className="fade-in">Connect with industry projects, build your portfolio, and get hired by top companies.</p>
                    <div className="hero-buttons fade-in">
                        <button onClick={() => navigate('/signup')} className="primary-btn">Get Started</button>
                        <button onClick={() => navigate('/main/browseprojects')} className="secondary-btn">Browse Projects <FontAwesomeIcon icon={faArrowRight} /></button>
                    </div>
                </div>
                <div className="hero-image fade-in">
                    <div className="floating-card card-1">
                        <FontAwesomeIcon icon={faLaptopCode} />
                        <span>100+ Active Projects</span>
                    </div>
                    <div className="floating-card card-2">
                        <FontAwesomeIcon icon={faUserGraduate} />
                        <span>500+ Students</span>
                    </div>
                    <div className="floating-card card-3">
                        <FontAwesomeIcon icon={faBriefcase} />
                        <span>50+ Hiring Companies</span>
                    </div>
                </div>
            </section>

            <section id="features" className="features">
                <h2 className="section-title fade-in">How It Works</h2>
                <div className="features-grid">
                    <div className="feature-card fade-in">
                        <div className="feature-icon">
                            <FontAwesomeIcon icon={faCode} />
                        </div>
                        <h3>Join Real Projects</h3>
                        <p>Work on industry-relevant projects across various domains like Web Development, Data Science, AI/ML, and more.</p>
                    </div>
                    <div className="feature-card fade-in">
                        <div className="feature-icon">
                            <FontAwesomeIcon icon={faLightbulb} />
                        </div>
                        <h3>Build Your Portfolio</h3>
                        <p>Create a compelling portfolio showcasing your skills and contributions to real-world projects.</p>
                    </div>
                    <div className="feature-card fade-in">
                        <div className="feature-icon">
                            <FontAwesomeIcon icon={faUsers} />
                        </div>
                        <h3>Collaborate in Teams</h3>
                        <p>Work with other students and industry mentors to develop your teamwork and communication skills.</p>
                    </div>
                    <div className="feature-card fade-in">
                        <div className="feature-icon">
                            <FontAwesomeIcon icon={faBriefcase} />
                        </div>
                        <h3>Get Hired</h3>
                        <p>Connect with companies looking for talent with practical experience and proven skills.</p>
                    </div>
                </div>
            </section>

            <section id="benefits" className="benefits">
                <div className="benefits-content">
                    <h2 className="section-title fade-in">Why Choose Schulen?</h2>
                    <div className="benefits-list">
                        <div className="benefit-item fade-in">
                            <div className="benefit-icon">
                                <FontAwesomeIcon icon={faChartLine} />
                            </div>
                            <div className="benefit-text">
                                <h3>Bridge the Experience Gap</h3>
                                <p>Gain practical experience that employers value, even before you graduate.</p>
                            </div>
                        </div>
                        <div className="benefit-item fade-in">
                            <div className="benefit-icon">
                                <FontAwesomeIcon icon={faHandshake} />
                            </div>
                            <div className="benefit-text">
                                <h3>Industry Connections</h3>
                                <p>Build relationships with companies and professionals in your field of interest.</p>
                            </div>
                        </div>
                        <div className="benefit-item fade-in">
                            <div className="benefit-icon">
                                <FontAwesomeIcon icon={faUserGraduate} />
                            </div>
                            <div className="benefit-text">
                                <h3>Learn by Doing</h3>
                                <p>Apply theoretical knowledge to practical challenges and develop problem-solving skills.</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="benefits-image fade-in">
                    <div className="stats-card">
                        <div className="stat">
                            <span className="stat-number">87%</span>
                            <span className="stat-label">of students find relevant opportunities</span>
                        </div>
                        <div className="stat">
                            <span className="stat-number">92%</span>
                            <span className="stat-label">report improved job prospects</span>
                        </div>
                        <div className="stat">
                            <span className="stat-number">3x</span>
                            <span className="stat-label">faster hiring process</span>
                        </div>
                    </div>
                </div>
            </section>

            <section id="testimonials" className="testimonials">
                <h2 className="section-title fade-in">Success Stories</h2>
                <div className="testimonial-cards">
                    <div className="testimonial-card fade-in">
                        <div className="testimonial-content">
                            <p>"Through Schulen, I worked on a real-world data science project that became the highlight of my resume. I received three job offers within a month of graduation!"</p>
                            <div className="testimonial-author">
                                <div className="author-avatar">AS</div>
                                <div className="author-info">
                                    <h4>Aisha Singh</h4>
                                    <p>Data Scientist at TechCorp</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="testimonial-card fade-in">
                        <div className="testimonial-content">
                            <p>"The web development project I joined through Schulen taught me more in 8 weeks than I learned in a year of classes. Now I'm working at my dream company!"</p>
                            <div className="testimonial-author">
                                <div className="author-avatar">RK</div>
                                <div className="author-info">
                                    <h4>Rahul Kumar</h4>
                                    <p>Frontend Developer at InnovateTech</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="testimonial-card fade-in">
                        <div className="testimonial-content">
                            <p>"As a hiring manager, I've found that students from Schulen have practical skills that make them productive from day one. It's now our primary recruitment channel."</p>
                            <div className="testimonial-author">
                                <div className="author-avatar">NP</div>
                                <div className="author-info">
                                    <h4>Neha Patel</h4>
                                    <p>HR Director at FutureSoft</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="cta">
                <div className="cta-content fade-in">
                    <h2>Ready to Launch Your Career?</h2>
                    <p>Join Schulen today and start building your future with real-world project experience.</p>
                    <button onClick={() => navigate('/signup')} className="primary-btn">Get Started Now</button>
                </div>
            </section>

            <footer className="footer">
                <div className="footer-content">
                    <div className="footer-logo">Schulen</div>
                    <div className="footer-links">
                        <div className="footer-column">
                            <h3>Platform</h3>
                            <ul>
                                <li><a href="#features">How It Works</a></li>
                                <li><a href="#benefits">Benefits</a></li>
                                <li><a href="#testimonials">Success Stories</a></li>
                            </ul>
                        </div>
                        <div className="footer-column">
                            <h3>Resources</h3>
                            <ul>
                                <li><a href="#">Blog</a></li>
                                <li><a href="#">Guides</a></li>
                                <li><a href="#">FAQ</a></li>
                            </ul>
                        </div>
                        <div className="footer-column">
                            <h3>Company</h3>
                            <ul>
                                <li><a href="#">About Us</a></li>
                                <li><a href="#">Contact</a></li>
                                <li><a href="#">Privacy Policy</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div className="footer-bottom">
                    <p>&copy; {new Date().getFullYear()} Schulen. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};