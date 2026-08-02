// SmartHire AI Landing Page Animation


// Create floating AI particles

const particleCount = 40;


for(let i = 0; i < particleCount; i++){

    let particle = document.createElement("div");

    particle.className = "particle";


    particle.style.left =
    Math.random() * 100 + "%";


    particle.style.top =
    Math.random() * 100 + "%";


    particle.style.animationDuration =
    (3 + Math.random()*5) + "s";


    document.body.appendChild(particle);

}



// Smooth scrolling for navigation links


document.querySelectorAll('nav a').forEach(link=>{


    link.addEventListener("click",function(e){


        let target =
        document.querySelector(
            this.getAttribute("href")
        );


        if(target){

            e.preventDefault();

            target.scrollIntoView({

                behavior:"smooth"

            });

        }


    });


});




// AI button animation


const buttons =
document.querySelectorAll("button");


buttons.forEach(btn=>{


    btn.addEventListener("mouseenter",()=>{


        btn.style.transform="scale(1.08)";


    });



    btn.addEventListener("mouseleave",()=>{


        btn.style.transform="scale(1)";


    });


});