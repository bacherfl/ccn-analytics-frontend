'use strict';

var baseUrl = "http://127.0.0.1:8080";

function statisticsController($scope,$http) {
    $scope.activeSession = false;
    $scope.init = function () {
        $http.get(baseUrl + "/statistics/sessions")
            .success(function(response) {
                $scope.sessions = response;
            });
        setTimeout(function() {
            $scope.init()
        }, 3600000);
    }

    $scope.refresh = function() {
        $http.get(baseUrl + "/statistics/sessions/" + $scope.activeSession)
            .success(function(response) {
                $scope.simulationRuns = response;
                $scope.sessionInfo = $scope.simulationRuns[0];
                $scope.refreshEvent = setTimeout(function() {
                    $scope.refresh()
                }, 180000);
                $scope.updateChart();
            });
        $http.get(baseUrl + "/statistics/sessions/" + $scope.activeSession + "/strategies")
            .success(function(response) {
                response.sort();
                $scope.strategies = response;
            });
    }

    $scope.loadSession = function(sessionId) {
        $scope.activeSession = sessionId;
        if ($scope.refreshEvent)
            clearTimeout($scope.refreshEvent);
        $scope.refresh();
    }

    $scope.init();

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
                   var tmp = [];
                   angular.forEach(sr.nodeStatistics, function(node) {
                       angular.forEach(node.periods, function(period) {
                            if (period.seqNr == periodNr) {
                                //data.push(period.averageSatisfactionRate);
                                tmp.push(period.averageSatisfactionRate);
                            }
                       });
                       data.push(ss.average(tmp));
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
                    var tmp = [];
                    angular.forEach(sr.nodeStatistics, function(node) {
                        angular.forEach(node.periods, function(period) {
                            if (period.seqNr == periodNr) {
                                //data.push(period.averageRtt);
                                tmp.push(period.averageRtt);
                            }
                        });
                    });
                    data.push(ss.average(tmp));
                }
            }
        });
        return data;
    }

    $scope.getBarChartValues = function(metric, nrPeriods) {
        var series = [];
        var drilldowns = {};
        angular.forEach($scope.strategies, function(strategy) {
            var drilldown = {};
            var medianSerie = {name: strategy, type: 'column', data: []};
            var errorSerie = {name: strategy, type: 'errorbar', data: []};
            for (var i = 1; i <= nrPeriods; i++) {
                var tmp;
                if (metric == "sat") {
                    tmp = $scope.getAvgSatRatesForPeriod(strategy, i);

                } else if (metric == "rtt") {
                    tmp = $scope.getAvgRttsForPeriod(strategy, i);
                }
                var mean = ss.mean(tmp);
                var error = 1.96 * ss.standard_deviation(tmp) / Math.sqrt(tmp.length);
                var lowerError = mean - error;
                var upperError = mean + error;
                medianSerie.data.push(mean);
                var error = [];

                //error.push(ss.quantile(tmp, 0.25));
                //error.push(ss.quantile(tmp, 0.75));
                error.push(lowerError);
                error.push(upperError);
                errorSerie.data.push(error);

                drilldown['name'] = strategy;
                drilldown['data'] = tmp;
                drilldowns[strategy] = drilldown;
            }
            series.push(medianSerie);
            series.push(errorSerie);
        });
        //return [medianSeries, errorSeries];
        return series;
    }

    $scope.getBoxPlotValues = function(metric, type) {
        var data;
        var outliers = [];
        if (metric == "sat") {
            data = $scope.getSortedAvgSatRates(type);
        } else if (metric == "rtt") {
            data = $scope.getSortedAvgRTTs(type);
        }
        var min = ss.quantile(data, 0.025);
        var lowerQuantile = ss.quantile(data, 0.25);
        var median = ss.median(data);
        var upperQuantile = ss.quantile(data, 0.75);
        var max = ss.quantile(data, 0.975);
        for (var i = 0; i < data.length; i++) {
            if ((data[i] < min) || (data[i] > max)) {
                outliers.push(data[i]);
            }
        }
        return [[min, lowerQuantile, median, upperQuantile, max], outliers];
    }

    $scope.updateChart = function() {
        var observations = [];
        var outliers = [];
        var i = 0;
        angular.forEach($scope.strategies, function(strategy) {
            var tmp = $scope.getBoxPlotValues("sat", strategy);
            observations.push(tmp[0]);
            //outliers = outliers.concat(tmp[1]);
            for (var j = 0; j < tmp[1].length; j++) {
                outliers.push([i, tmp[1][j]]);
            }
            i++;
        });

        angular.element('#satisfactionRateContainer').highcharts({

            chart: {
                type: 'boxplot'
            },
            exporting: {
                sourceHeight: 400,
                sourceWidth: 400
            },
            title: {
                text: null
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
                },
                max: 1.0,
                min: 0.0
            },

            series: [{
                name: 'Observations',
                data: observations,
                tooltip: {
                    headerFormat: '<em>Strategy {point.key}</em><br/>'
                }
            }, {
                name: 'Outlier',
                color: Highcharts.getOptions().colors[0],
                type: 'scatter',
                data: outliers,
                marker: {
                    fillColor: 'white',
                    lineWidth: 1,
                    lineColor: Highcharts.getOptions().colors[0]
                },
                tooltip: {
                    pointFormat: '{point.y}'
                }
            }]
        });

        var observations = [];
        var outliers = [];
        var i = 0;
        angular.forEach($scope.strategies, function(strategy) {
            var tmp = $scope.getBoxPlotValues("rtt", strategy);
            observations.push(tmp[0]);
            //outliers = outliers.concat(tmp[1]);
            for (var j = 0; j < tmp[1].length; j++) {
                outliers.push([i, tmp[1][j]]);
            }
            i++;
        });

        angular.element('#RTTContainer').highcharts({

            chart: {
                type: 'boxplot'
            },
            exporting: {
                sourceHeight: 400,
                sourceWidth: 400
            },
            title: {
                text: null
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
                },
                max: 400,
                min: 0
            },

            series: [{
                name: 'Observations',
                data: observations,
                tooltip: {
                    headerFormat: '<em>Strategy {point.key}</em><br/>'
                }
            }, {
                name: 'Outlier',
                color: Highcharts.getOptions().colors[0],
                type: 'scatter',
                data: outliers,
                marker: {
                    fillColor: 'white',
                    lineWidth: 1,
                    lineColor: Highcharts.getOptions().colors[0]
                },
                tooltip: {
                    pointFormat: '{point.y} ms'
                }
            }]
        });

        var barChartValues = $scope.getBarChartValues("sat", 4);

        angular.element('#satisfactionRatePeriodContainer').highcharts({
            chart: {
                type: 'column'
            },
            exporting: {
                sourceHeight: 400,
                sourceWidth: 400
            },
            title: {
                text: null
            },
            xAxis: {
                categories: ['1', '2', '3', '4'],   //TODO dynamically set periods
                title: {
                    text: null
                }
            },
            yAxis: {
                min: 0,
                max: 1.0,
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
            /*
            legend: {
                layout: 'horizontal',
                align: 'right',
                verticalAlign: 'top',
                x: -40,
                y: 100,
                floating: true,
                borderWidth: 1,
                backgroundColor: ((Highcharts.theme && Highcharts.theme.legendBackgroundColor) || '#FFFFFF'),
                shadow: true
            },
            */
            credits: {
                enabled: false
            },
            series: barChartValues
        });

        var barChartValuesRTT = $scope.getBarChartValues("rtt", 4);

        angular.element('#RTTPeriodContainer').highcharts({
            chart: {
                //type: 'bar'
            },
            exporting: {
                sourceHeight: 400,
                sourceWidth: 400
            },
            title: {
                text: null
            },
            xAxis: {
                categories: ['1', '2', '3', '4'],   //TODO dynamically set periods
                title: {
                    text: null
                }
            },
            yAxis: {
                min: 0,
                max: 400,
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
            /*
            legend: {
                layout: 'horizontal',
                align: 'right',
                verticalAlign: 'top',
                x: -40,
                y: 100,
                floating: true,
                borderWidth: 1,
                backgroundColor: ((Highcharts.theme && Highcharts.theme.legendBackgroundColor) || '#FFFFFF'),
                shadow: true
            },
            */
            credits: {
                enabled: false
            },
            series: barChartValuesRTT
        });
    }
}