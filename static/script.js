console.log("Script loaded...");

const houseColors = {
  "Gryffindor": "#740001",  
  "Slytherin":  "#1A472A",  
  "Ravenclaw":  "#0E1A40", 
  "Hufflepuff": "#FFD800"  
};

const bloodOpacity = {
  'Pure-blood': 1,     
  'Half-blood': 0.5,   
  'Pure-blood or half-blood':0.7,
  'Muggle-born': 0.3,  
  'Unknown': 0.1       
};

let selectedRect = null;
let selectedBubble = null;

/**
 * Unifying blood status strings
 */
function unifyBloodStatus(str) {
  if (!str) return "Unknown";
  let cleaned = str.trim().toLowerCase();

  if (cleaned.includes("pure-blood") && cleaned.includes("half-blood")) {
    return "Pure-blood or half-blood";
  }

  return str.trim();
}


d3.dsv(";", "data/Characters.csv").then(function(data) {
  console.log("Raw Data Loaded:", data);

  const mainHouses = new Set(["Gryffindor", "Slytherin", "Ravenclaw", "Hufflepuff"]);
  const filteredData = data.filter(d => d.House && mainHouses.has(d.House.trim()));

  filteredData.forEach(d => {
    d.BloodStatusClean = unifyBloodStatus(d["Blood status"]);
  });

  const bloodMap = d3.rollup(
    filteredData,
    v => v.length,
    row => row.House.trim(),
    row => row.BloodStatusClean
  );

  const bloodData = [];
  bloodMap.forEach((houseMap, house) => {
    houseMap.forEach((count, bloodStatus) => {
      bloodData.push({ house, blood: bloodStatus, count });
    });
  });

  const width = 640, height = 370;
  const quadrantWidth = width / 2;
  const quadrantHeight = height / 2;

  const housePositions = {
    Gryffindor: { x: 200, y: 210 },
    Slytherin: { x: 520, y: 210 },
    Ravenclaw: { x: 200, y: 395 },
    Hufflepuff: { x: 520, y: 395 }
  };

  const sizeScale = d3.scaleSqrt()
    .domain([0, d3.max(bloodData, d => d.count)])
    .range([10, 30]);

  const svg = d3.select("#chart").append("svg")
    .attr("width", width)
    .attr("height", height);

  svg.selectAll("rect")
        .data(Object.keys(housePositions))
        .enter().append("rect")
        .attr("x", d => housePositions[d].x - quadrantWidth / 2)
        .attr("y", d => housePositions[d].y - quadrantHeight / 2)
        .attr("width", quadrantWidth)
        .attr("height", quadrantHeight)
        .attr("fill", d => houseColors[d])
        .attr("opacity", 1)
        .on("mouseover", function(event, d) {
          d3.select(this).transition().duration(200).style("filter", "brightness(1.2)");
        })
        .on("mouseout", function(event, d) {
          d3.select(this).transition().duration(200).style("filter", "none");
        })
        
        .on("click", function(event, d) {
          if (selectedRect && selectedRect !== this) {
            d3.select(selectedRect).style("stroke", "none").style("stroke-width", 0);
          }
          
          selectedRect = this;
          d3.select(this)
            .style("stroke", "#C69848")
            .style("stroke-width", 3)
            .style("filter", "none");
      
          const houseMembers = filteredData.filter(row => row.House.trim() === d);
      
          const genderMap = d3.rollup(
            houseMembers,
            v => v.length,
            row => row.Gender
          );
          const genderData = Array.from(genderMap, ([gender, count]) => ({ gender, count }));
      
          const bloodMap = d3.rollup(
            houseMembers,
            v => v.length,
            row => row.BloodStatusClean 
          );
          const bloodData = Array.from(bloodMap, ([bStat, count]) => ({ bStat, count }));
      
          const speciesMap = d3.rollup(
            houseMembers,
            v => v.length,
            row => row.Species
          );
          const speciesData = Array.from(speciesMap, ([spec, count]) => ({ spec, count }));
      
          const genderList = genderData.map(g => `${g.gender || "Unknown"}: ${g.count}`).join("<br>");
          const bloodList = bloodData.map(b => `${b.bStat || "Unknown"}: ${b.count}`).join("<br>");
          const speciesList = speciesData.map(s => `${s.spec || "Unknown"}: ${s.count}`).join("<br>");
      
          const emblems = {
            "Gryffindor": "images/gryffindor.jpg",
            "Slytherin":  "images/slytherin.jpg",
            "Ravenclaw":  "images/ravenclaw.jpg",
            "Hufflepuff": "images/hufflepuff.jpg"
          };
      
          d3.select("#side-panel").html(`
            <h2>${d}</h2>
            <img class="house-image" src="${emblems[d]}" alt="${d} emblem">
            <p><strong>Total Characters:</strong> ${houseMembers.length}</p>
      
            <h3>Gender Breakdown</h3>
            <p>${genderList}</p>
      
            <h3>Blood Status</h3>
            <p>${bloodList}</p>
      
            <h3>Species</h3>
            <p>${speciesList}</p>
          `);
        });

  const simulation = d3.forceSimulation(bloodData)
    .force("x", d3.forceX(d => housePositions[d.house].x).strength(0.2))
    .force("y", d3.forceY(d => housePositions[d.house].y).strength(0.2))
    .force("collide", d3.forceCollide(d => sizeScale(d.count) + 2))
    .on("tick", ticked);

  const bubbles = svg.selectAll("circle")
    .data(bloodData)
    .enter().append("circle")
    .attr("r", d => sizeScale(d.count))
    .attr("fill", d => {
      switch(d.house) {
          case "Gryffindor":
              return "#F2D2D2";  
          case "Slytherin":
              return "#A1B3A1";  
          case "Ravenclaw":
              return "#BCC6D1";  
          case "Hufflepuff":
              return "#705F0E";  
          default:
              return "black";  
      }
  })
    .attr("stroke", "#EAEAEA")
    .attr("opacity", d => bloodOpacity[d.blood])
    .style("cursor", "pointer")
    .on("mouseover", function(event, d) {
      d3.select(this).transition().duration(200).style("filter", "brightness(1.2)");
    })
    .on("mouseout", function(event, d) {
      d3.select(this).transition().duration(200).style("filter", "none");
    })
    .on("click", function(event, d) {
      if (selectedBubble && selectedBubble !== this) {
        d3.select(selectedBubble).style("stroke", "#EAEAEA").style("stroke-width", 1);  // Reset previous selection
      }
      
      selectedBubble = this;
      d3.select(this)
        .style("stroke", "#fff")
        .style("stroke-width", 3)
        .style("filter", "none");
  
      const houseMembers = filteredData.filter(row => row.BloodStatusClean.trim() === d.blood);  // Assuming d.blood is the category
  
      d3.select("#side-panel").html(`
        <h2>${d.blood}</h2>  <!-- Show the blood status category name -->
        <p><strong>Total Characters:</strong> ${houseMembers.length}</p>  <!-- Total count of that category -->
      `);
    });
    
  function ticked() {
    bubbles.attr("cx", d => d.x)
           .attr("cy", d => d.y);
  }

  svg.selectAll("text")
    .data(Object.keys(housePositions))
    .enter().append("text")
    .attr("x", d => housePositions[d].x)
    .attr("y", d => housePositions[d].y - 50)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .style("fill", "#FFF")
    .text(d => d);

  //PATRONUS SCRIPTS START HERE: 
  
  // patronuses (need to fill based on ones listed in dataset)
const patronuses = {
  "Stag": "images/stag.png", //image source: https://stock.adobe.com/search/images?filters%5Bcontent_type%3Aphoto%5D=1&filters%5Bcontent_type%3Aillustration%5D=1&filters%5Bcontent_type%3Azip_vector%5D=1&filters%5Bcontent_type%3Aimage%5D=1&k=patronus&order=relevance&price%5B%24%5D=1&limit=100&search_page=1&search_type=usertyped&acp=&aco=patronus&get_facets=0&asset_id=1090897075
  "Horse": "images/horse.png", //image source: https://stock.adobe.com/search/images?filters%5Bcontent_type%3Aphoto%5D=1&filters%5Bcontent_type%3Aillustration%5D=1&filters%5Bcontent_type%3Azip_vector%5D=1&filters%5Bcontent_type%3Aimage%5D=1&order=relevance&price%5B%24%5D=1&limit=100&search_page=1&search_type=usertyped&acp=&aco=horse+patronus&k=horse+patronus&get_facets=0&asset_id=572394226
};

//this functions just assigns a random patronus based on the user's input (we can modify it to be based on most common patronuses per house instead of name?)
function getRandomPatronus(name) {
  const patronusNames = Object.keys(patronuses);
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return patronusNames[hash % patronusNames.length];
}

//textbox for the patronus feature
document.getElementById("patronus-btn").addEventListener("click", function() {
  const name = document.getElementById("wizard-name").value.trim();
  
  if (name === "") {
      document.getElementById("patronus-result").innerHTML = "Please enter your name!";
      return;
  }

  const patronus = getRandomPatronus(name);
  document.getElementById("patronus-result").innerHTML = `✨ Your Patronus is a <strong>${patronus}</strong>!`;

  //based on the result of the random functiont, we then output one of our stored patronus images
  const imgElement = document.getElementById("patronus-image");
  imgElement.src = patronuses[patronus];
  imgElement.style.display = "block";

  // Add magical glow effect
  imgElement.classList.add("glow-effect"); //inspired by the code taken from here: https://codepen.io/pugson/pen/eYNXvyN


});

}).catch(function(error) {
  console.error("Error loading or processing data:", error);
});

