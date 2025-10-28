"use client";

import styles from "./HomePage.module.css";
import Participant from "@/components/Participant/Participant";

const HomePage = () => {
    return (
        <section className={`${styles.homepage} ${styles["homepage__border"]} ${styles["homepage__text"]}`}>
            <Participant />
        </section>
    );
};

export default HomePage;