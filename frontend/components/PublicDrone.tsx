"use client";
import dynamic from "next/dynamic";
const DroneShowcase=dynamic(()=>import("./DroneShowcase").then(m=>m.DroneShowcase),{ssr:false});
export function PublicDrone(){return <DroneShowcase publicSite/>;}
