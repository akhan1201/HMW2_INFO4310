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

  // Dimensions
  const svgWidth = 600, svgHeight = 500;
  const margin = { top: 20, right: 20, bottom: 50, left: 60 }; 

  const width = svgWidth - margin.left - margin.right;
  const height = svgHeight - margin.top - margin.bottom;

  // Creating SVG
  const svg = d3.select("#chart")
    .append("svg")
    .attr("width", svgWidth)
    .attr("height", svgHeight);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // X scale
  const xScale = d3.scaleBand()
    .domain(houseDataArray.map(d => d.House))
    .range([0, width])
    .padding(0.3);

  // Y scale
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

  // Axis Labels
  // X-axis label
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
    .attr("y", -45) 
    .attr("fill", "#2f2f2f")
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Number of Characters");

  // 11) Bars
  const bars = g.selectAll(".bar")
    .data(houseDataArray)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", d => xScale(d.House))
    .attr("y", d => yScale(d.count))
    .attr("width", xScale.bandwidth())
    .attr("height", d => height - yScale(d.count))
    .style("fill", d => houseColors[d.House] || "steelblue")
    .style("cursor", "pointer") // pointer on hover
    .style("stroke-width", 0) 
    .on("mouseover", function(event, d) {
      // Lighten color on hover
      d3.select(this)
        .transition()
        .duration(200)
        .style("filter", "brightness(1.2)");
    })
    .on("mouseout", function(event, d) {
      // Return to original color if not chosen
      d3.select(this)
        .transition()
        .duration(200)
        .style("filter", "none");
    })
    .on("click", function(event, d) {
      // Reset stroke
      if (selectedBar && selectedBar !== this) {
        d3.select(selectedBar)
          .style("stroke", "none")
          .style("stroke-width", 0);
      }
      // Mark bar and give golden glow
      selectedBar = this;
      d3.select(this)
        .style("stroke", "#FFD700")
        .style("stroke-width", 3)
        .style("filter", "none"); 

      // Gather rows for the clicked House
      const houseMembers = filteredData.filter(row => row.House.trim() === d.House);

      // Group by Gender
      const genderMap = d3.rollup(
        houseMembers,
        v => v.length,
        row => row.Gender
      );
      const genderData = Array.from(genderMap, ([gender, count]) => ({ gender, count }));

      // Group by our cleaned Blood Status
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

      // Converting each breakdown to HTML
      const genderList = genderData.map(g => `${g.gender || "Unknown"}: ${g.count}`).join("<br>");
      const bloodList = bloodData.map(b => `${b.bStat || "Unknown"}: ${b.count}`).join("<br>");
      const speciesList = speciesData.map(s => `${s.spec || "Unknown"}: ${s.count}`).join("<br>");

      // Side-panel
      d3.select("#side-panel").html(`
        <h2>${d.House}</h2>
        <p><strong>Total Characters:</strong> ${d.count}</p>

        <h3>Gender Breakdown</h3>
        <p>${genderList}</p>

        <h3>Blood Status</h3>
        <p>${bloodList}</p>

        <h3>Species</h3>
        <p>${speciesList}</p>
      `);
    });

}).catch(function(error) {
  console.error("Error loading or processing data:", error);
});
