'use strict';
function statisticsController($scope,$http) {

    $scope.refresh = function () {
        $http.get("http://127.0.0.1:8080/statistics/strategies")
            .success(function(response) {
                $scope.strategies = response;
            });
        $http.get("http://127.0.0.1:8080/statistics")
            .success(function(response) {

                $scope.simulationRuns = response;
                $scope.lastRefresh = new Date().getTime();
                setTimeout(function() {
                    $scope.refresh()
                }, 60000);
                $scope.updateChart();
            });
    }

    $scope.refreshSince = function(tstamp) {
        $http.get("http://127.0.0.1:8080/statistics/strategies")
            .success(function(response) {
                $scope.strategies = response;
            });

        $http.get("http://127.0.0.1:8080/statistics/since/" + tstamp)
            .success(function(response) {
                $scope.simulationRuns = response;
                $scope.lastRefresh = new Date().getTime();
                setTimeout(function() {
                    $scope.refresh($scope.lastRefresh)
                }, 10000);
            });
    }

    $scope.refresh();

    $scope.options = {
        chart: {
            type: 'parallelCoordinates',
            height: 450,
            margin: {
                top: 30,
                right: 40,
                bottom: 50,
                left: 0
            },
            dimensions: [
                "sdnCacheDownloadRate",
                "minSatRatio",
                "interestInterval",
                "enablePrefetching",
                "averageSatisfactionRate",
                "averageRtt",
            ]
        }
    };

    $scope.averageSatRateByType = function(type) {
        var sum = 0.0;
        var count = 0;

        angular.forEach($scope.simulationRuns, function(value, index) {
            if ((value.averageSatisfactionRate > 0) && (value.strategyName == type)) {
                sum += value.averageSatisfactionRate;
                count++;
            }
        });
        if (count > 0) {
            var ret = 100 * (sum /count);
            return ret.toFixed(2);
        } else {
            return "-";
        }
    }
    $scope.averageRTTByType = function(type) {
        var sum = 0.0;
        var count = 0;

        angular.forEach($scope.simulationRuns, function(value, index) {
            if ((value.averageSatisfactionRate > 0) && (value.strategyName == type)) {
                sum += value.averageRtt;
                count++;
            }
        });
        if (count > 0) {
            var ret = sum /count;
            return ret.toFixed(2);
        } else {
            return "-";
        }
    }
    $scope.nrOfSimulationRunsByType = function(type) {
        var count = 0;
        angular.forEach($scope.simulationRuns, function(value, index) {
            if ((value.completed) && (value.strategyName == type)) {
                count++;
            }
        });
        return count;
    }
    $scope.stdDevOfSatRateByType = function(type) {
        var avgSatRate = $scope.averageSatRateByType(type);
        var count = 0;
        var sum = 0.0;
        angular.forEach($scope.simulationRuns, function(value, index) {
            if ((value.averageSatisfactionRate > 0) && (value.strategyName == type)) {
                sum += (100 * value.averageSatisfactionRate - avgSatRate) * (100 * value.averageSatisfactionRate - avgSatRate);
                count++;
            }
        });
        if (count > 0) {
            return Math.sqrt(sum / count).toFixed(2);
        } else {
            return "-";
        }
    }
    $scope.stdDevOfRTTByType = function(type) {
        var avgSatRate = $scope.averageRTTByType(type);
        var count = 0;
        var sum = 0.0;
        angular.forEach($scope.simulationRuns, function(value, index) {
            if ((value.averageSatisfactionRate > 0) && (value.strategyName == type)) {
                sum += (value.averageRtt - avgSatRate) * (value.averageRtt - avgSatRate);
                count++;
            }
        });
        if (count > 0) {
            return Math.sqrt(sum / count).toFixed(2);
        } else {
            return "-";
        }
    }

    $scope.getSortedAvgSatRates = function(type) {
        var data = [];
        angular.forEach($scope.simulationRuns, function(value, index) {
            if ((value.completed) && (value.strategyName == type)) {
                if (value.averageSatisfactionRate > 0)
                    data.push(value.averageSatisfactionRate);
            }
        });

        return data;
    }

    $scope.getSortedAvgRTTs = function(type) {
        var data = [];
        angular.forEach($scope.simulationRuns, function(value, index) {
            if ((value.completed) && (value.strategyName == type)) {
                if (value.averageRtt > 0)
                    data.push(value.averageRtt);
            }
        });

        return data;
    }

    $scope.getBoxPlotValues = function(metric, type) {
        var data;
        if (metric == "sat") {
            data = $scope.getSortedAvgSatRates(type);
        } else if (metric == "rtt") {
            data = $scope.getSortedAvgRTTs(type);
        }
        var min = ss.min(data);
        var lowerQuantile = ss.quantile(data, 0.25);
        var median = ss.median(data);
        var upperQuantile = ss.quantile(data, 0.75);
        var max = ss.max(data);
        return [min, lowerQuantile, median, upperQuantile, max];
    }

    $scope.updateChart = function() {
        var observations = [];

        angular.forEach($scope.strategies, function(strategy) {
            observations.push($scope.getBoxPlotValues("sat", strategy));
        });

        angular.element('#satisfactionRateContainer').highcharts({

            chart: {
                type: 'boxplot'
            },

            title: {
                text: 'Satisfaction Rate'
            },

            legend: {
                enabled: false
            },

            xAxis: {
                categories: $scope.strategies,
                title: {
                    text: 'Strategy'
                }
            },

            yAxis: {
                title: {
                    text: 'Sat. Rate'
                }
            },

            series: [{
                name: 'Observations',
                data: observations,
                tooltip: {
                    headerFormat: '<em>Strategy {point.key}</em><br/>'
                }
            }]

        });

        var observations = [];

        angular.forEach($scope.strategies, function(strategy) {
            observations.push($scope.getBoxPlotValues("rtt", strategy));
        });

        angular.element('#RTTContainer').highcharts({

            chart: {
                type: 'boxplot'
            },

            title: {
                text: 'RTT'
            },

            legend: {
                enabled: false
            },

            xAxis: {
                categories: $scope.strategies,
                title: {
                    text: 'Strategy'
                }
            },

            yAxis: {
                title: {
                    text: 'RTT'
                }
            },

            series: [{
                name: 'Observations',
                data: observations,
                tooltip: {
                    headerFormat: '<em>Strategy {point.key}</em><br/>'
                }
            }]

        });
    }
}