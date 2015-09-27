﻿/*  MyNetSensors 
    Copyright (C) 2015 Derwish <derwish.pro@gmail.com>
    License: http://www.gnu.org/licenses/gpl-3.0.txt  
*/

using System;
using System.Collections.Generic;
using System.Configuration;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Web;
using System.Web.Mvc;
using Microsoft.AspNet.SignalR;
using MyNetSensors.GatewayRepository;
using MyNetSensors.SensorsHistoryRepository;
using MyNetSensors.WebController.Code.Hubs;


namespace MyNetSensors.WebController.Controllers
{
    public class GatewayController : Controller
    {
        IHubContext context = GlobalHost.ConnectionManager.GetHubContext<GatewayHub>();

        // GET: Gateway
        public ActionResult Index()
        {
            return View();
        }

        public ActionResult Messages()
        {
            return View();
        }

        public ActionResult Settings()
        {
            return View();
        }

        public ActionResult Observe()
        {
            return View();
        }

        public ActionResult Control()
        {
            return View();
        }



        public async Task<ActionResult> DropNodes()
        {
            await DropHistoryDatabase();
            context.Clients.Client(GatewayHubStaticData.gatewayId).clearLog();
            context.Clients.Client(GatewayHubStaticData.gatewayId).clearNodes();
            return RedirectToAction("Settings");
        }

        public async Task<ActionResult> DropHistory()
        {
            await DropHistoryDatabase();

            return RedirectToAction("Settings");
        }

        public async Task<ActionResult> StopRecordingHistory()
        {
            await StopRecordingNodesHistory();

            return RedirectToAction("Settings");
        }

        private async Task DropHistoryDatabase()
        {
            await StopRecordingNodesHistory();
            //waiting for all history writings finished
            await Task.Delay(2000);
            
            string cs = ConfigurationManager.ConnectionStrings["GatewayDbConnection"].ConnectionString;
            ISensorsHistoryRepository historyDb = new SensorsHistoryRepositoryDapper(cs);
            historyDb.DropAllSensorsHistory();


            //todo check dropped
        }


        private async Task StopRecordingNodesHistory()
        {
            string cs = ConfigurationManager.ConnectionStrings["GatewayDbConnection"].ConnectionString;
            IGatewayRepository gatewayDb = new GatewayRepositoryDapper(cs);

            var nodes = gatewayDb.GetNodes();
            //turn off writing history in nodes settings
            foreach (var node in nodes)
            {
                    Debug.WriteLine(node.nodeId);
                foreach (var sensor in node.sensors)
                {
                    sensor.storeHistoryEnabled = false;
                }
                gatewayDb.UpdateNodeSettings(node);
                context.Clients.Client(GatewayHubStaticData.gatewayId).updateNodeSettings(node);
                await Task.Delay(100);
            }
        }

        public int GetConnectedUsersCount()
        {
            return GatewayHubStaticData.connectedUsersId.Count;
        }


    }
}