console.log("Script loaded...");

// House color map
const houseColors = {
  "Gryffindor": "#740001",  
  "Slytherin":  "#1A472A",  
  "Ravenclaw":  "#0E1A40", 
  "Hufflepuff": "#FFD800"  
};

// Current bar track
let selectedBar = null;

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

  // Filter to the 4 main houses only
  const mainHouses = new Set(["Gryffindor", "Slytherin", "Ravenclaw", "Hufflepuff"]);
  const filteredData = data.filter(d => d.House && mainHouses.has(d.House.trim()));

  // "BloodStatusClean" column for each row
  filteredData.forEach(d => {
    d.BloodStatusClean = unifyBloodStatus(d["Blood status"]);
  });

  // Rolling up data by House
  const houseMap = d3.rollup(
    filteredData,
    v => v.length,
    d => d.House.trim()
  );
  const houseDataArray = Array.from(houseMap, ([House, count]) => ({ House, count }));
  console.log("Aggregated Data:", houseDataArray);

  // Frame dimensions (matching the golden frame)
  const frameWidth = 700, frameHeight = 500;
  const margin = { top: 50, right: 50, bottom: 50, left: 48 };

  const width = frameWidth - margin.left - margin.right;
  const height = frameHeight - margin.top - margin.bottom;

  // Creating SVG container
  const svg = d3.select("#chart")
    .append("svg")
    .attr("width", frameWidth)
    .attr("height", frameHeight)
    .style("position", "relative");


  // Embed the histogram chart inside the frame
  const foreignObject = svg.append("foreignObject")
    .attr("x", margin.left)  // Adjust x positioning inside frame
    .attr("y", margin.top + 10)   // Adjust y positioning inside frame
    .attr("width", width)   // Scale down width
    .attr("height", height)
    .append("xhtml:div")
    .style("width", `${width}px`)
    .style("height", `${height}px`)
    .style("overflow", "hidden");

  // Create an inner SVG inside the `foreignObject` for the chart
  const chartSVG = foreignObject.append("svg")
    .attr("width", width)
    .attr("height", height);

  const g = chartSVG.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
  // X Scale
  const xScale = d3.scaleBand()
    .domain(houseDataArray.map(d => d.House))
    .range([15, width])
    .padding(0.3);

  // Y Scale
  const maxCount = d3.max(houseDataArray, d => d.count) || 0;
  const yScale = d3.scaleLinear()
    .domain([0, maxCount])
    .nice()
    .range([height, 0]);

  // Axes
  const xAxis = g.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(xScale));

  const yAxis = g.append("g")
    .call(d3.axisLeft(yScale));

    xAxis.append("text")
    .attr("class", "axis-label")
    .attr("x", width / 2)
    .attr("y", 35)
    .attr("fill", "#2f2f2f")
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Hogwarts Houses");

  // Y-axis label
  yAxis.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -35) 
    .attr("fill", "#2f2f2f")
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Number of Characters");

  // Bars
  chartSVG.selectAll(".bar")
    .data(houseDataArray)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", d => xScale(d.House))
    .attr("y", d => yScale(d.count))
    .attr("width", xScale.bandwidth())
    .attr("height", d => height - yScale(d.count))
    .style("fill", d => houseColors[d.House] || "steelblue")
    .style("cursor", "pointer")
    .on("mouseover", function(event, d) {
      d3.select(this).transition().duration(200).style("filter", "brightness(1.8)");
    })
    .on("mouseout", function(event, d) {
      d3.select(this).transition().duration(200).style("filter", "none");
    })
    .on("click", function(event, d) {
      if (selectedBar && selectedBar !== this) {
        d3.select(selectedBar).style("stroke", "none").style("stroke-width", 0);
      }
      selectedBar = this;
      d3.select(this)
        .style("stroke", "#000")
        .style("stroke-width", 3)
        .style("filter", "none");

      const houseMembers = filteredData.filter(row => row.House.trim() === d.House);

      // Group by Gender
      const genderMap = d3.rollup(
        houseMembers,
        v => v.length,
        row => row.Gender
      );
      const genderData = Array.from(genderMap, ([gender, count]) => ({ gender, count }));

      // Group by Blood Status
      const bloodMap = d3.rollup(
        houseMembers,
        v => v.length,
        row => row.BloodStatusClean 
      );
      const bloodData = Array.from(bloodMap, ([bStat, count]) => ({ bStat, count }));

      // Group by Species
      const speciesMap = d3.rollup(
        houseMembers,
        v => v.length,
        row => row.Species
      );
      const speciesData = Array.from(speciesMap, ([spec, count]) => ({ spec, count }));

      // Convert each breakdown to HTML
      const genderList = genderData.map(g => `${g.gender || "Unknown"}: ${g.count}`).join("<br>");
      const bloodList = bloodData.map(b => `${b.bStat || "Unknown"}: ${b.count}`).join("<br>");
      const speciesList = speciesData.map(s => `${s.spec || "Unknown"}: ${s.count}`).join("<br>");

      const emblems = {
        "Gryffindor": "images/gryffindor.jpg",
        "Slytherin":  "images/slytherin.jpg",
        "Ravenclaw":  "images/ravenclaw.jpg",
        "Hufflepuff": "images/hufflepuff.jpg"
      }; 

      // Side-panel Update
      d3.select("#side-panel").html(`
        <h2>${d.House}</h2>
        <img class="house-image" src="${emblems[d.House]}" alt="${d.House} emblem">
        <p><strong>Total Characters:</strong> ${d.count}</p>

        <h3>Gender Breakdown</h3>
        <p>${genderList}</p>

        <h3>Blood Status</h3>
        <p>${bloodList}</p>

        <h3>Species</h3>
        <p>${speciesList}</p>
      `);
    });

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

