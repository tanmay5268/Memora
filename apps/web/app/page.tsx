"use client";
import GradientWaves from "@/components/GradientWaves";
import StaggeredMenu from "@/components/StaggeredMenu";
const menuItems = [
  { label: "Home", ariaLabel: "Go to home page", link: "/" },
  { label: "About", ariaLabel: "Learn about us", link: "/about" },
  { label: "Services", ariaLabel: "View our services", link: "/services" },
  { label: "Contact", ariaLabel: "Get in touch", link: "/contact" },
];

const socialItems = [
  { label: "Twitter", link: "https://twitter.com" },
  { label: "GitHub", link: "https://github.com" },
  { label: "LinkedIn", link: "https://linkedin.com" },
];
export default function Home() {
  return (
    <div className="bg-black  w-screen h-screen">
      <div className="relative" style={{ width: "100%", height: "100%" }}>
        <GradientWaves
          horizonColor="#ff5a00"
          waveColor="#FF9FFC"
          crestColor="#FFFFFF"
          speed={0.4}
          amplitude={2.5}
          waveScale={0.6}
          waveRatio={0.9}
          swell={35}
          turbulence={20}
          tilt={1.11}
          zoom={1}
          height={5.5}
          fogDepth={15}
          detail="medium"
          brightness={1}
          opacity={1}
          mouseInteraction
          parallaxStrength={0.5}
          grain
          grainIntensity={0.05}
        />
      </div>
      <div className="">
        <StaggeredMenu
          isFixed={true}
          position="right"
          items={menuItems}
          socialItems={socialItems}
          displaySocials
          displayItemNumbering={true}
          menuButtonColor="#ffffff"
          openMenuButtonColor="#fff"
          changeMenuColorOnOpen={false}
          colors={["#ff5a00", "#ff5a00"]}
          logoUrl="/icon.svg"
          accentColor="#ff5a00"
          onMenuOpen={() => console.log("Menu opened")}
          onMenuClose={() => console.log("Menu closed")}
        />
      </div>
      {/*<div className="bg-amber-400 h-screen ">
        hrllo
      </div>*/}
    </div>
  );
}
