"use client";

import styles from "./HomePage.module.css";

const HomePage = () => {
    return (
        <section className={`${styles.homepage} ${styles["homepage__border"]} ${styles["homepage__text"]}`}>
            <p>Hello from Participant Home Page</p>
        </section>
    );
};

export default HomePage;