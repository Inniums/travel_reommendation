/**
 * @constant
 * @async
 * @callback
 * @import
 */

// Allowable places to go at mug-ways.
let mugways;
fetch("travel_recommendation_api.json")
  .then((response) => response.json())
  .then((result) => {
    mugways = result;
  })
  .catch((error) => {
    console.log(error);
    console.log("Failed to fetch allowable places to go");
  });

const searchButton = document.querySelector(".search-button");
const resetButton = document.querySelector(".reset-button");
const placeDescDiv = document.querySelector(".place-description");
const searchForm = document.querySelector(".search-form");

// Get api keys
let google_api_key;
let open_weather_api_key;
fetch("api_key.json")
  .then((response) => {
    return response.json();
  })
  .then((data) => {
    google_api_key = data.google_map_api_key;
    open_weather_api_key = data.open_weather_api_key;
  })
  .catch((error) => {
    console.error(error);
    console.log("Failed to fetch api key");
  });

//  fetch city info from google map api
const geoLocationApi = (city) =>
  `https://maps.googleapis.com/maps/api/geocode/json?address=${city}&key=${google_api_key}`;
const openWeatherApi = (city) =>
  `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${open_weather_api_key}&units=metric`;

// find location information;
const getlocalTime = async (city) => {
  let return_text = await fetch(openWeatherApi(city))
    .then((response) => response.json())
    .then((data) => {
      let timezoneOffsetInHours = data.timezone / 3600;

      return `Current Local Time (${city}): ${getFormattedTimeWithOffset(
        timezoneOffsetInHours
      )}`;

      function getFormattedTimeWithOffset(offsetHours) {
        const now = new Date();

        // Apply offsets to the utc  time
        now.setHours(now.getUTCHours() + offsetHours);

        // Format time as HH:mm:ss
        const hours = String(now.getHours()).padStart(2, "0");
        const minutes = String(now.getMinutes()).padStart(2, "0");
        const seconds = String(now.getSeconds()).padStart(2, "0");

        return `${hours}:${minutes}:${seconds}`;
      }
    })
    .catch((error) => {
      console.log(error);
    });
  return return_text;
};

// No longer in use
const getlocaTimeByCity = async (city) => {
  let response = await fetch(openWeatherApi(city));
  let result = await response.json();
  if (Number(result.cod) !== 200) {
    // find the closest administrative area
    let getArea = await fetch(geoLocationApi(city));
    let area = await getArea.json();

    // update city name
    if (area.results.length !== 0) {
      city = area.results[0].address_components.find((address) =>
        address.types.includes("political")
      ).long_name;
    }
  }
  return await getlocalTime(city);
};

// find country
const findCountry = (db, country) => {
  const database = db;
  const country_name = country;

  // all countries in database
  let countries = database.countries;

  let response = {};

  // Find country by keyword
  const findInCountries = countries.find((country) =>
    country.name.toUpperCase().includes(country_name.toUpperCase())
  );

  if (findInCountries) {
    response.flag = true;
    response.cities = findInCountries.cities;
    response.country_name = findInCountries.name;
  } else {
    response.flag = false;
  }
  return response;
};

const findCity = (db, city_name) => {
  const database = db;
  let city_info;

  // all keywords in database
  let countries = database.countries;
  let temples = database.temples;
  let beaches = database.beaches;

  // find city in countries
  countries.forEach((country) => {
    let isExist = country.cities.find((city) =>
      city.name.toUpperCase().includes(city_name.toUpperCase())
    );
    if (isExist) city_info = isExist;
  });
  if (!city_info)
    city_info = temples.find((temple) =>
      temple.name.toUpperCase().includes(city_name.toUpperCase())
    );
  if (!city_info)
    city_info = beaches.find((beach) =>
      beach.name.toUpperCase().includes(city_name.toUpperCase())
    );
  return city_info;
};

// Updated generateSearchContent to handle async function for localTime
const generateSearchContent = async (value) => {
  let db = mugways;
  let locations = new Array();
  let innerHTML = "";

  if (value == "" || value == undefined || value == null) {
    // do nothing
  } else if (value.toUpperCase().includes("COUN")) {
    db.countries.forEach((country) => {
      locations = [...locations, ...country.cities];
    });
    innerHTML = configureInnerHtml(locations);
  } else if (value.toUpperCase().includes("TEM")) {
    locations = [...locations, ...db.temples];
    innerHTML = configureInnerHtml(locations);
  } else if (value.toUpperCase().includes("BEAC")) {
    locations = [...locations, ...db.beaches];
    innerHTML = configureInnerHtml(locations);
  } else {
    let isCountry = findCountry(mugways, value);
    if (isCountry.flag) {
      // Find country time zone
      locations = [...locations, ...isCountry.cities];

      // Since getlocalTime is async, we await its resolution
      let localTime = await getlocalTime(isCountry.country_name);

      innerHTML = configureInnerHtml(locations, localTime);
    } else {
      let isCity = findCity(mugways, value);
      if (isCity) {
        let city_name = isCity.name.split(",").map((ele) => ele.trim())[1];
        locations = [...locations, isCity];
        let localTime = await getlocalTime(city_name);
        innerHTML = configureInnerHtml(locations, localTime);
      }
    }
  }
  return innerHTML;
};

function configureInnerHtml(locations, location_time) {
  let innerHTML = `<div class="place-about"><h3 id="place-about">${
    location_time ? location_time : ""
  }</h3></div>${locations
    .map((city) => {
      let htmlcontent = `
  <div class="place-item">
    <img src="${city.imageUrl}" alt="place-image" class="place-image">
    <h2 class="place-name">${city.name}</h2>
    <p class="place-text">${city.description}</p>
    <button class="visit">Visit</button>
  </div>
  `;
      return htmlcontent.replace(/\n/g, "");
    })
    .join("")}`.replace(/\n/g, "");
  return innerHTML;
}

// Updating the search form event listener to be async
searchForm.addEventListener("submit", async (event) => {
  event.preventDefault(); // prevent the form from reloading or redirecting page
  slideOut();
});

resetButton.addEventListener("click", slideOut);

function slideOut() {
  const items = document.querySelectorAll(".place-item");
  const placeAbout = document.querySelectorAll(".place-about");

  // Add 'hidden' class to slide out all items
  items.forEach((item) => {
    item.classList.add("hidden");
  });

  placeAbout.forEach((item) => {
    item.classList.add("hidden");
  });

  // Wait for the slide-out animation to complete (500ms), then change content
  setTimeout(async () => {
    const search_bar = document.querySelector(".search-bar").value;

    // We await generateSearchContent here because it's async
    placeDescDiv.innerHTML = await generateSearchContent(search_bar); // Update content

    // Now slide in the new content after content change
    setTimeout(() => {
      slideIn();
    }, 50); // Slight delay to ensure content is in DOM before slide-in
  }, 500); // Match this to your CSS transition duration for smooth timing
}

function slideIn() {
  const items = document.querySelectorAll(".place-item");
  const placeAbout = document.querySelectorAll(".place-about");
  items.forEach((item) => {
    item.classList.remove("hidden"); // Remove the 'hidden' class to slide in items
  });
  placeAbout.forEach((item) => {
    item.classList.remove("hidden");
  });
}
