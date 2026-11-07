"use client";

import {useEffect} from "react";
import {gsap} from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";

/** Restrained editorial reveals. Spatial controls on the model remain manual. */
export function PublicMotion() {
  useEffect(()=>{
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger);
    const root=document.querySelector(".public-site");
    if (!root) return;
    const context=gsap.context(()=>{
      gsap.fromTo(".public-hero-copy > .public-kicker, .public-hero h1, .public-lead, .public-actions",{autoAlpha:0,y:18},{autoAlpha:1,y:0,duration:.72,stagger:.12,ease:"power2.out",clearProps:"all"});
      gsap.utils.toArray<HTMLElement>(".section-intro, .capability-list, .evidence-graphic").forEach((element)=>{
        gsap.fromTo(element,{autoAlpha:0,y:24},{autoAlpha:1,y:0,duration:.7,ease:"power2.out",clearProps:"all",scrollTrigger:{trigger:element,start:"top 88%",once:true}});
      });
    },root);
    return ()=>context.revert();
  },[]);
  return null;
}
