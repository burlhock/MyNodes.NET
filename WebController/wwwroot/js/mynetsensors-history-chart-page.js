﻿/*  MyNetSensors 
    Copyright (C) 2015 Derwish <derwish.pro@gmail.com>
    License: http://www.gnu.org/licenses/gpl-3.0.txt  
*/


var clientsHub;
var gatewayHardwareConnected = null;
var signalRServerConnected = null;

var elementsFadeTime = 300;

var groups = new vis.DataSet();
groups.add({ id: 0 });

var DELAY = 1000; // delay in ms to add new data points

var autoscroll = document.getElementById('autoscroll');
var charttype = document.getElementById('charttype');

// create a graph2d with an (currently empty) dataset
var container = document.getElementById('visualization');
var dataset = new vis.DataSet();
var options ;

var graph2d = new vis.Graph2d(container, dataset, groups, options);


function renderStep() {
    var now = vis.moment();
    var range = graph2d.getWindow();
    var interval = range.end - range.start;
    switch (autoscroll.value) {
        case 'continuous':
            graph2d.setWindow(now - interval, now, { animation: false });
            requestAnimationFrame(renderStep);
            break;
        case 'discrete':
            graph2d.setWindow(now - interval, now, { animation: false });
            setTimeout(renderStep, DELAY);
            break;
        case 'none':
            setTimeout(renderStep, DELAY);
            break;
        default: // 'static'
            // move the window 90% to the left when now is larger than the end of the window
            if (now > range.end) {
                graph2d.setWindow(now - 0.1 * interval, now + 0.9 * interval);
            }
            setTimeout(renderStep, DELAY);
            break;
    }
}

renderStep();


$(document).ready(function () {
    //Loading data frow server
    $.ajax({
        url: "../../GetSensorDataJsonByDbId/" + dbId, //get dbId from viewbag before
        dataType: "json",
        success: function (data) {
            if ("chartData" in data) {
                // console.log(data);
                addChartData(data.chartData);
                $('#infoPanel').hide();
                $('#chartPanel').fadeIn(elementsFadeTime);
            } else {
                $('#infoPanel').html("There are no history. Chart shows realtime data only. Check node <a href='../../../Node/Settings/" + nodeId + "'>settings</a>.");
                $('#chartPanel').fadeIn(elementsFadeTime);
                showNow();
            }
        },
        error: function () {
            $('#infoPanel').html("<p class='text-danger'>Failed to get data from server!</p>");
        }
    });

    updateCharType();


});


function addChartData(chartData) {
    dataset.add(chartData);
    
    var start = vis.moment(chartData[0].x).add(-1, 'seconds');
    var end = vis.moment(chartData[chartData.length - 1].x).add(1, 'seconds');

    if (urlStart != "0")
        start = new Date(urlStart);

    if (urlEnd != "0")
        end = new Date(urlEnd);

    var options = {
        start: start,
        end: end
    };
    graph2d.setOptions(options);
    // graph2d.setWindow({ start:start,end: end });

    /* groups.add({
         id: 1,
         //  className: 'vis-graph-group0',
         // options: {excludeFromLegend: true}
    });*/


   //graph2d.fit();

}

function updateCharType() {
    switch (charttype.value) {
        case 'bars':
            options = {
                height: '370px',
                style: 'bar',
                drawPoints: false,
                barChart: { width: 50, align: 'right', sideBySide: false }
            };
            break;
        case 'splines':
            options = {
                height: '370px',
                style: 'line',
                drawPoints: { style: 'circle', size: 6 },
                shaded: { enabled: false },
                interpolation: { enabled: true }
            };
            break;
        case 'shadedsplines':
            options = {
                style: 'line',
                height: '370px',
                drawPoints: { style: 'circle', size: 6 },
                shaded: { enabled: true, orientation: 'bottom' },
                interpolation: { enabled: true }
            };
            break;
        case 'lines':
            options = {
                height: '370px',
                style: 'line',
                drawPoints: { style: 'square', size: 6 },
                shaded: { enabled: false },
                interpolation: { enabled: false }
            };
            break;
        case 'shadedlines':
            options = {
                height: '370px',
                style: 'line',
                drawPoints: { style: 'square', size: 6 },
                shaded: { enabled: true, orientation: 'bottom' },
                interpolation: { enabled: false }
            };
            break;
        case 'dots':
            options = {
                height: '370px',
                style: 'points',
                drawPoints: { style: 'circle', size: 10 }
            };
            break;
        default:
            break;
    }



    //setOptions cause a bug when switching to dots!!!
    //graph2d.setOptions(options);
    //thats why we need redraw:
    redrawChart(options);


}

function redrawChart(options) {
    var window = graph2d.getWindow();
    options.start = window.start;
    options.end = window.end;
    graph2d.destroy();
    graph2d = new vis.Graph2d(container, dataset, groups, options);
}






$(function () {
    clientsHub = $.connection.clientsHub;
    
    clientsHub.client.OnSensorUpdatedEvent = function (sensor) {
        OnSensorUpdatedEvent(sensor);
    };

    $.connection.hub.start();

    $.connection.hub.stateChanged(function (change) {
        if (change.newState === $.signalR.connectionState.reconnecting) {
            noty({ text: 'Web server is not responding!', type: 'error', timeout: false });
            signalRServerConnected = false;
        }
        else if (change.newState === $.signalR.connectionState.connected) {
            if (signalRServerConnected == false) {
                noty({ text: 'Connected to web server.', type: 'alert', timeout: false });
                getIsHardwareConnected();
                getNodes();
            }
            signalRServerConnected = true;
        }
    });

    getIsHardwareConnected();
});


function getIsHardwareConnected() {
    $.ajax({
        url: "/GatewayAPI/IsHardwareConnected/",
        type: "POST",
        success: function (connected) {
            hardwareStateChanged(connected);
        }
    });
}


function hardwareStateChanged(connected) {
    if (connected && gatewayHardwareConnected === false) {
        noty({ text: 'Gateway hardware is online.', type: 'alert', timeout: false });
    } else if (!connected) {
        noty({ text: 'Gateway hardware is offline!', type: 'error', timeout: false });
    }

    gatewayHardwareConnected = connected;
}


function OnSensorUpdatedEvent(sensor) {
    if (sensor.nodeId != nodeId || sensor.sensorId != sensorId)
        return;

    var sensorData = JSON.parse(sensor.sensorDataJson);

    for (var i = 0; i < sensorData.length; i++) {
        var state = sensorData[i].state;
        if (sensorData[i].dataType == 16 && state == 0) //V_TRIPPED
            state = -0.1;
        //Add new point to chart
        var now = vis.moment();
        dataset.add({
            x: now,
            y: state,
            group: 0
        });
    }
}


var zoomTimer;
function showNow() {
    clearTimeout(zoomTimer);
    autoscroll.value = "none";
    var window = {
        start: vis.moment().add(-30, 'seconds'),
        end: vis.moment()
    };
    graph2d.setWindow(window);
    //timer needed for prevent zoomin freeze bug
    zoomTimer = setTimeout(function (parameters) {
        autoscroll.value = "continuous";
    }, 1000);

}

function showAll() {
    clearTimeout(zoomTimer);
    autoscroll.value = "none";
    graph2d.fit();
}

function share() {
    var url = $(location).attr('host') + $(location).attr('pathname');
    var start = graph2d.getWindow().start;
    var end = graph2d.getWindow().end;
    url += "?autoscroll=" + autoscroll.value;
    url += "&style=" + charttype.value;
    url += "&start=" + start.getTime();
    url += "&end=" + end.getTime();
    $('#shareModal').modal();
    $('#url').val(url);

}