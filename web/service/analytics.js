/**
 * Gets data from datalake using the data-service APIs and calculates analytics on the data
 */

var request = require('request');
var API_URL = process.env.DATA_SERVER || "http://localhost:3000";

/**
 * Gets the population of total patients
 */
function getPopulation() {
	return new Promise(function(resolve, reject) {
		request(API_URL + "/api/v1/population", function (error, response, body) {
	 		if (!error && response.statusCode == 200) {
	 			body = JSON.parse(body);
	    		var population = body["population"];
				return resolve(population);
	  		} else {
	  			return resolve(0);
	  		}
	  	});
	})
}

/**
 * Gets the city allergy data of patients
 */
function getCities() {
	return new Promise(function(resolve, reject) {
		request(API_URL + "/api/v1/cities", function (error, response, body) {
	 		if (!error && response.statusCode == 200) {
	 			body = JSON.parse(body);
	    		var cities = body["cities"];
				return resolve(cities);
	  		} else {
	  			return resolve(0);
	  		}
	  	});
	})
}

/**
 * Gets the list of allergies found in the cities
 */
function getAllergies() {
	return new Promise(function(resolve, reject) {
		request(API_URL + "/api/v1/allergies", function (error, response, body) {
	 		if (!error && response.statusCode == 200) {
	 			body = JSON.parse(body);
	    		var allergies = body["allergies"];
				return resolve(allergies);
	  		} else {
	  			return resolve(0);
	  		}
	  	});
	})
}

/**
 * Creates JSON object for city population data and calculates min, max, and mean cities for population
 * See README.md for more information on structure of JSON object created
 */
function getPopulationStats() {
	return new Promise(function(resolve, reject) {

		getPopulation().then(function(population) {

			getCities().then(function(cities) {

				var populationStats = {
					cities: [],
					min: {},
					max: {},
					mean: 0
				}

				for (var city = 0; city < cities.length; city++) {

					populationStats.cities.push({city: cities[city].city,
						state: cities[city].state,
						percentage: cities[city].population/population,
						population: cities[city].population});

					if (!populationStats.min.population || populationStats.min.population > cities[city].population) {
						populationStats.min = {city: cities[city].city,
							percentage: cities[city].population/population,
							population: cities[city].population};
					}

					if (!populationStats.max.population || populationStats.max.population < cities[city].population) {
						populationStats.max = {city: cities[city].city,
							percentage: cities[city].population/population,
							population: cities[city].population};
					}
					populationStats.mean = populationStats.mean + cities[city].population;
				}

				populationStats.mean = populationStats.mean / cities.length;

				resolve(populationStats);
			})
		})
	})
}

/**
 * Creates JSON object for city allergy data and calculates min, max, and mean cities for total allergies, allergy types, developed allergies, and allergies outgrown
 * See README.md for more information on structure of JSON object created
 */
function getAllergyStats() {
	return new Promise(function(resolve, reject) {

		getCities().then(function(cities) {

			getAllergies().then(function(allergies) {

				var allergyStats = {
					cities: [],
					stats: {
						total: {},
						type: [],
						outgrown: [],
						developed: []
					}
				}

				var allergyCityTotals = [];

				for (var city = 0; city < cities.length; city++) {

					var currentCity = {
						city: cities[city].city,
						state: cities[city].state,
						total: {total:0},
						type: [],
						allergies: []
					};


					for (var allergy = 0; allergy < cities[city].allergies.length; allergy++) {

						// TOTAL

						currentCity.total = {total: currentCity.total.total + cities[city].allergies[allergy].developed.length};

						// TYPE
					
						var typeInCurrentCityList = false;

						for (var type = 0; type < currentCity.type.length; type++) {
							if (currentCity.type[type].type == cities[city].allergies[allergy].type) {
								currentCity.type[type].total = currentCity.type[type].total + cities[city].allergies[allergy].developed.length;
								currentCity.type[type].percentage = currentCity.type[type].percentage + cities[city].allergies[allergy].developed.length;
								typeInCurrentCityList = true;
							}
						}

						if (!typeInCurrentCityList) {
							currentCity.type.push({type: cities[city].allergies[allergy].type,
													total: cities[city].allergies[allergy].developed.length,
													percentage: cities[city].allergies[allergy].developed.length});
						}

						// DEVELOPED & OUTGROWN

						currentCity.allergies.push({
							allergy: cities[city].allergies[allergy].allergy,
							type: cities[city].allergies[allergy].type,
							outgrown: {total: cities[city].allergies[allergy].outgrown.length,
										percentage: cities[city].allergies[allergy].outgrown.length / cities[city].allergies[allergy].developed.length,
										ages: cities[city].allergies[allergy].outgrown},
							developed: {total: cities[city].allergies[allergy].developed.length,
										percentage: cities[city].allergies[allergy].developed.length / cities[city].population,
										ages: cities[city].allergies[allergy].developed}
						});

					}

					// TOTAL

					currentCity.total.percentage = currentCity.total.total / cities[city].population;

					if (!allergyStats.stats.total.min) {
						allergyStats.stats.total.min = {};
					}

					if (!allergyStats.stats.total.max) {
						allergyStats.stats.total.max = {};
					}

					if (!allergyStats.stats.total.min.total || allergyStats.stats.total.min.total.min > currentCity.total.total) {
						allergyStats.stats.total.min.total = {
							city: currentCity.city,
							min: currentCity.total.total
						};
					}

					if (!allergyStats.stats.total.min.percentage || allergyStats.stats.total.min.percentage.min > currentCity.total.percentage) {
						allergyStats.stats.total.min.percentage = {
							city: currentCity.city,
							min: currentCity.total.percentage
						};
					}

					if (!allergyStats.stats.total.max.total || allergyStats.stats.total.max.total.max < currentCity.total.total) {
						allergyStats.stats.total.max.total = {
							city: currentCity.city,
							max: currentCity.total.total,
						};
					}

					if (!allergyStats.stats.total.max.percentage || allergyStats.stats.total.max.percentage.max < currentCity.total.percentage) {
						allergyStats.stats.total.max.percentage = {
							city: currentCity.city,
							max: currentCity.total.percentage,
						};
					}

					if (!allergyStats.stats.total.mean) {
						allergyStats.stats.total.mean = {total: currentCity.total.total, percentage: currentCity.total.percentage};
					} else {
						allergyStats.stats.total.mean.total = allergyStats.stats.total.mean.total + currentCity.total.total;
						allergyStats.stats.total.mean.percentage = allergyStats.stats.total.mean.percentage + currentCity.total.percentage;
					}

					// TYPE

					for (var type = 0; type < currentCity.type.length; type++) {
						currentCity.type[type].percentage = currentCity.type[type].percentage / cities[city].population;

						var typeInStatsList = false;

						for (var statType = 0; statType < allergyStats.stats.type.length; statType++) {
							if (allergyStats.stats.type[statType].type == currentCity.type[type].type) {
								typeInStatsList = true;

								if (allergyStats.stats.type[statType].min.total.min > currentCity.type[type].total) {
									allergyStats.stats.type[statType].min.total = {city: currentCity.city,
																		min: currentCity.type[type].total};
								}

								if (allergyStats.stats.type[statType].min.percentage.min > currentCity.type[type].percentage) {
									allergyStats.stats.type[statType].min.percentage = {city: currentCity.city,
																		min: currentCity.type[type].percentage};
								}

								if (allergyStats.stats.type[statType].max.total.max < currentCity.type[type].total) {
									allergyStats.stats.type[statType].max.total = {city: currentCity.city,
																		max: currentCity.type[type].total};
								}

								if (allergyStats.stats.type[statType].max.percentage.max < currentCity.type[type].percentage) {
									allergyStats.stats.type[statType].max.percentage = {city: currentCity.city,
																		max: currentCity.type[type].percentage};
								}

								allergyStats.stats.type[statType].mean.total = allergyStats.stats.type[statType].mean.total + currentCity.type[type].total;
								allergyStats.stats.type[statType].mean.percentage = allergyStats.stats.type[statType].mean.percentage + currentCity.type[type].percentage;
							}
						}

						if (!typeInStatsList) {
							allergyStats.stats.type.push({
								type: currentCity.type[type].type,
								min: {total: {city: currentCity.city, min: currentCity.type[type].total}, percentage: {city: currentCity.city, min: currentCity.type[type].percentage}},
								max: {total: {city: currentCity.city, max: currentCity.type[type].total}, percentage: {city: currentCity.city, max: currentCity.type[type].percentage}},
								mean: {total: currentCity.type[type].total, percentage: currentCity.type[type].percentage}
							});
						}
					}

					// DEVELOPED

					for (var allergy = 0; allergy < allergies.length; allergy++) {
						var allergyInCity = false;
						var allergyInStats = false;

						for (var cityAllergy = 0; cityAllergy < currentCity.allergies.length; cityAllergy++) {
							if (allergies[allergy] == currentCity.allergies[cityAllergy].allergy) {
								allergyInCity = true;
								break;
							}
						}

						for (var statAllergy = 0; statAllergy < allergyStats.stats.developed.length; statAllergy++) {
							if (allergies[allergy] == allergyStats.stats.developed[statAllergy].allergy) {
								allergyInStats = true;
								break;
							}
						} 

						if (allergyInCity && allergyInStats) {
							if (allergyStats.stats.developed[statAllergy].min.total.min > currentCity.allergies[cityAllergy].developed.total) {
								allergyStats.stats.developed[statAllergy].min.total = {city: currentCity.city, 
																				min: currentCity.allergies[cityAllergy].developed.total};
							}

							if (allergyStats.stats.developed[statAllergy].min.percentage.min > currentCity.allergies[cityAllergy].developed.percentage) {
								allergyStats.stats.developed[statAllergy].min.percentage = {city: currentCity.city, 
																				min: currentCity.allergies[cityAllergy].developed.percentage};
							}

							if (allergyStats.stats.developed[statAllergy].max.total.max < currentCity.allergies[cityAllergy].developed.total) {
								allergyStats.stats.developed[statAllergy].max.total = {city: currentCity.city, 
																				max: currentCity.allergies[cityAllergy].developed.total};
							}

							if (allergyStats.stats.developed[statAllergy].max.percentage.max < currentCity.allergies[cityAllergy].developed.percentage) {
								allergyStats.stats.developed[statAllergy].max.percentage = {city: currentCity.city, 
																				max: currentCity.allergies[cityAllergy].developed.percentage};
							}

							allergyStats.stats.developed[statAllergy].mean.total = allergyStats.stats.developed[statAllergy].mean.total + currentCity.allergies[cityAllergy].developed.total;
							allergyStats.stats.developed[statAllergy].mean.percentage = allergyStats.stats.developed[statAllergy].mean.percentage + currentCity.allergies[cityAllergy].developed.percentage;
						
						} else if (allergyInCity) {
							allergyStats.stats.developed.push({
								allergy: currentCity.allergies[cityAllergy].allergy,
								min: {total: {city: currentCity.city, min: currentCity.allergies[cityAllergy].developed.total},
									percentage: {city: currentCity.city, min: currentCity.allergies[cityAllergy].developed.percentage}},
								max: {total: {city: currentCity.city, max: currentCity.allergies[cityAllergy].developed.total},
									percentage: {city: currentCity.city, max: currentCity.allergies[cityAllergy].developed.percentage}},
								mean: {total: currentCity.allergies[cityAllergy].developed.total, percentage: currentCity.allergies[cityAllergy].developed.percentage}
							});

						} else if (allergyInStats) {
							allergyStats.stats.developed[statAllergy].min.total = {city: currentCity.city, min: 0};
							allergyStats.stats.developed[statAllergy].min.percentage = {city: currentCity.city, min: 0};
						}
					}

					// OUTGROWN

					for (var allergy = 0; allergy < allergies.length; allergy++) {
						var allergyInCity = false;
						var allergyInStats = false;

						for (var cityAllergy = 0; cityAllergy < currentCity.allergies.length; cityAllergy++) {
							if (allergies[allergy] == currentCity.allergies[cityAllergy].allergy) {
								allergyInCity = true;
								break;
							}
						}

						for (var statAllergy = 0; statAllergy < allergyStats.stats.outgrown.length; statAllergy++) {
							if (allergies[allergy] == allergyStats.stats.outgrown[statAllergy].allergy) {
								allergyInStats = true;
								break;
							}
						} 

						if (allergyInCity && allergyInStats) {
							if (allergyStats.stats.outgrown[statAllergy].min.total.min > currentCity.allergies[cityAllergy].outgrown.total) {
								allergyStats.stats.outgrown[statAllergy].min.total = {city: currentCity.city, 
																				min: currentCity.allergies[cityAllergy].outgrown.total};
							}

							if (allergyStats.stats.outgrown[statAllergy].min.percentage.min > currentCity.allergies[cityAllergy].outgrown.percentage) {
								allergyStats.stats.outgrown[statAllergy].min.percentage = {city: currentCity.city, 
																				min: currentCity.allergies[cityAllergy].outgrown.percentage};
							}

							if (allergyStats.stats.outgrown[statAllergy].max.total.max < currentCity.allergies[cityAllergy].outgrown.total) {
								allergyStats.stats.outgrown[statAllergy].max.total = {city: currentCity.city, 
																				max: currentCity.allergies[cityAllergy].outgrown.total};
							}

							if (allergyStats.stats.outgrown[statAllergy].max.percentage.max < currentCity.allergies[cityAllergy].outgrown.percentage) {
								allergyStats.stats.outgrown[statAllergy].max.percentage = {city: currentCity.city, 
																				max: currentCity.allergies[cityAllergy].outgrown.percentage};
							}

							allergyStats.stats.outgrown[statAllergy].mean.total = allergyStats.stats.outgrown[statAllergy].mean.total + currentCity.allergies[cityAllergy].outgrown.total;
							allergyStats.stats.outgrown[statAllergy].mean.percentage = allergyStats.stats.outgrown[statAllergy].mean.percentage + currentCity.allergies[cityAllergy].outgrown.percentage;

							allergyCityTotals[statAllergy] = allergyCityTotals[statAllergy] + 1;
						
						} else if (allergyInCity) {
							allergyStats.stats.outgrown.push({
								allergy: currentCity.allergies[cityAllergy].allergy,
								min: {total: {city: currentCity.city, min: currentCity.allergies[cityAllergy].outgrown.total},
									percentage: {city: currentCity.city, min: currentCity.allergies[cityAllergy].outgrown.percentage}},
								max: {total: {city: currentCity.city, max: currentCity.allergies[cityAllergy].outgrown.total},
									percentage: {city: currentCity.city, max: currentCity.allergies[cityAllergy].outgrown.percentage}},
								mean: {total: currentCity.allergies[cityAllergy].outgrown.total, percentage: currentCity.allergies[cityAllergy].outgrown.percentage}
							});

							allergyCityTotals.push(1);
						}
					}

					allergyStats.cities.push(currentCity);
				}
				
				allergyStats.stats.total.mean.total = allergyStats.stats.total.mean.total / cities.length;
				allergyStats.stats.total.mean.percentage = allergyStats.stats.total.mean.percentage / cities.length;

				for (var type = 0; type < allergyStats.stats.type.length; type++) {
					allergyStats.stats.type[type].mean.total = allergyStats.stats.type[type].mean.total / cities.length;
					allergyStats.stats.type[type].mean.percentage = allergyStats.stats.type[type].mean.percentage / cities.length;
				}

				for (var allergy = 0; allergy < allergyStats.stats.developed.length; allergy++) {
					allergyStats.stats.developed[allergy].mean.total = allergyStats.stats.developed[allergy].mean.total / cities.length;
					allergyStats.stats.developed[allergy].mean.percentage = allergyStats.stats.developed[allergy].mean.percentage / cities.length;
				}

				for (var allergy = 0; allergy < allergyStats.stats.outgrown.length; allergy++) {
					allergyStats.stats.outgrown[allergy].mean.total = allergyStats.stats.outgrown[allergy].mean.total / allergyCityTotals[allergy];
					allergyStats.stats.outgrown[allergy].mean.percentage = allergyStats.stats.outgrown[allergy].mean.percentage / allergyCityTotals[allergy];
				}

				resolve(allergyStats);
			})
		})
	})
}


module.exports.getPopulationStats = getPopulationStats;
module.exports.getAllergyStats = getAllergyStats;
