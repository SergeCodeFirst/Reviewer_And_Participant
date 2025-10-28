"use client";

import styles from "./HomePage.module.css";
import SpeechForm from "@/components/SpeachForm/SpeachForm";

const HomePage = () => {
    return (
        <section className={`${styles.homepage} ${styles["homepage__border"]} ${styles["homepage__text"]}`}>
            <p>Welcome reviewer's Home Page</p>
            <SpeechForm />
        </section>
    );
};

export default HomePage;