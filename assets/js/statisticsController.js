'use strict';

var baseUrl = "http://127.0.0.1:8080";

function statisticsController($scope,$http) {

    $scope.refresh = function () {
        $http.get(baseUrl + "/statistics/strategies")
            .success(function(response) {
                $scope.strategies = response;
            });
        $http.get(baseUrl + "/statistics")
            .success(function(response) {

                $scope.simulationRuns = response;
                $scope.lastRefresh = new Date().getTime();
                setTimeout(function() {
                    $scope.refresh()
                }, 600000);
                $scope.updateChart();
            });
    }

    $scope.refreshSince = function(tstamp) {
        $http.get(baseUrl + "/statistics/strategies")
            .success(function(response) {
                $scope.strategies = response;
            });

        $http.get(baseUrl + "/statistics/since/" + tstamp)
            .success(function(response) {
                $scope.simulationRuns = response;
                $scope.lastRefresh = new Date().getTime();
                setTimeout(function() {
                    $scope.refresh($scope.lastRefresh)
                }, 600000);
            });
    }

    $scope.refresh();

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

    $scope.getAvgSatRatesForPeriod = function(type, periodNr) {
        var data = [];
        angular.forEach($scope.simulationRuns, function(sr) {
           if ((sr.completed) && (sr.strategyName == type)) {
               if (sr.averageSatisfactionRate > 0) {
                   angular.forEach(sr.nodeStatistics, function(node) {
                       angular.forEach(node.periods, function(period) {
                            if (period.seqNr == periodNr) {
                                data.push(period.averageSatisfactionRate);
                            }
                       });
                   });
               }
           }
        });
        return data;
    }

    $scope.getAvgRttsForPeriod = function(type, periodNr) {
        var data = [];
        angular.forEach($scope.simulationRuns, function(sr) {
            if ((sr.completed) && (sr.strategyName == type)) {
                if (sr.averageSatisfactionRate > 0) {
                    angular.forEach(sr.nodeStatistics, function(node) {
                        angular.forEach(node.periods, function(period) {
                            if (period.seqNr == periodNr) {
                                data.push(period.averageRtt);
                            }
                        });
                    });
                }
            }
        });
        return data;
    }

    $scope.getBarChartValues = function(metric, nrPeriods) {
        var medianSeries = [];
        var errorSeries = [];
        angular.forEach($scope.strategies, function(strategy) {
            var medianSerie = {name: strategy, type: 'bar', data: []};
            var errorSerie = {name: strategy, type: 'error', data: []};
            for (var i = 1; i <= nrPeriods; i++) {
                if (metric == "sat") {
                    var tmp = $scope.getAvgSatRatesForPeriod(strategy, i);
                    medianSerie.data.push(ss.average(tmp));
                    var error = [];
                    error.push(ss.quantile(tmp, 0.25));
                    error.push(ss.quantile(tmp, 0.75));
                    errorSerie.data.push(error);
                } else if (metric == "rtt") {
                    var tmp = $scope.getAvgRttsForPeriod(strategy, i);
                    medianSerie.data.push(ss.median(tmp));
                    var error = [];
                    error.push(ss.quantile(tmp, 0.25));
                    error.push(ss.quantile(tmp, 0.75));
                    errorSerie.data.push(error);
                }
            }
            medianSeries.push(medianSerie);
            errorSeries.push(errorSerie);
        });
        return [medianSeries, errorSeries];
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
        var median = ss.average(data);
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

            tooltip: {
                yDecimals: 2
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

            tooltip: {
                yDecimals: 2
            },

            xAxis: {
                categories: $scope.strategies,
                title: {
                    text: 'Strategy'
                }
            },

            yAxis: {
                title: {
                    text: 'RTT [ms]'
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

        var barChartValues = $scope.getBarChartValues("sat", 4);

        angular.element('#satisfactionRatePeriodContainer').highcharts({
            chart: {
                type: 'bar'
            },
            title: {
                text: 'Satisfaction Rate per Period'
            },
            xAxis: {
                categories: ['1', '2', '3', '4'],   //TODO dynamically set periods
                title: {
                    text: null
                }
            },
            yAxis: {
                min: 0,
                max: 1.5,
                title: {
                    text: 'Satisfaction Rate',
                    align: 'high'
                },
                labels: {
                    overflow: 'justify'
                }
            },
            tooltip: {
                valueSuffix: '',
                yDecimals: 2
            },
            plotOptions: {
                bar: {
                    dataLabels: {
                        enabled: true
                    }
                }
            },
            legend: {
                layout: 'vertical',
                align: 'right',
                verticalAlign: 'top',
                x: -40,
                y: 100,
                floating: true,
                borderWidth: 1,
                backgroundColor: ((Highcharts.theme && Highcharts.theme.legendBackgroundColor) || '#FFFFFF'),
                shadow: true
            },
            credits: {
                enabled: false
            },
            series: barChartValues[0]
        });

        var barChartValuesRTT = $scope.getBarChartValues("rtt", 4);

        angular.element('#RTTPeriodContainer').highcharts({
            chart: {
                type: 'bar'
            },
            title: {
                text: 'RTT per Period'
            },
            xAxis: {
                categories: ['1', '2', '3', '4'],   //TODO dynamically set periods
                title: {
                    text: null
                }
            },
            yAxis: {
                min: 0,
                title: {
                    text: 'RTT [ms]',
                    align: 'high'
                },
                labels: {
                    overflow: 'justify'
                }
            },
            tooltip: {
                valueSuffix: ' ms'
            },
            plotOptions: {
                bar: {
                    dataLabels: {
                        enabled: true
                    }
                }
            },
            legend: {
                layout: 'vertical',
                align: 'right',
                verticalAlign: 'top',
                x: -40,
                y: 100,
                floating: true,
                borderWidth: 1,
                backgroundColor: ((Highcharts.theme && Highcharts.theme.legendBackgroundColor) || '#FFFFFF'),
                shadow: true
            },
            credits: {
                enabled: false
            },
            series: barChartValuesRTT[0]
        });
    }
}