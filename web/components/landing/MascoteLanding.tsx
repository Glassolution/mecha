"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import s from "./landing.module.css";
import acenando from "@/public/marca/cleo-acenando.png";
import pulando from "@/public/marca/cleo-pulando.png";

/** Movimento decorativo, pausado fora da tela e desativado com redução de movimento. */
export function MascoteLanding({ pose }: { pose: "acenando" | "pulando" }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visivel, setVisivel] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setVisivel(entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={s.mascoteCena} data-visivel={visivel} data-pose={pose} aria-hidden="true">
    <div className={s.mascoteMovimento}><Image src={pose === "acenando" ? acenando : pulando} width={176} height={176} sizes="(max-width: 550px) 112px, 152px" alt="" draggable={false} /></div>
    <span className={s.mascoteSombra} />
  </div>;
}
