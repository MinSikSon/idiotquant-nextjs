import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import styles from "./newsletter-entry.module.css";

export function NewsletterEntry({ label, description }: { label: string; description: string }) {
    return (
        <Link href="/newsletter" className={styles.entry}>
            <Image src="/images/onboarding/newsletter-coyote.webp" width={404} height={440}
                alt="" unoptimized loading="eager" className={styles.coyote} />
            <span className={styles.copy}>
                <strong>{label}</strong>
                <span>{description}</span>
            </span>
            <ArrowRight size={22} strokeWidth={2.5} aria-hidden="true" />
        </Link>
    );
}
