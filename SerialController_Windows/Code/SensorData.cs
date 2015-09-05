﻿using System;

namespace SerialController_Windows.Code
{
    public class SensorData
    {
        public SensorDataType? dataType;
        public string state;

        public override string ToString()
        {
            string s="";

            if (dataType != null)
                s += String.Format("Data type: {0}, ", dataType.ToString());
            else
                s += String.Format("Data type: unknown, ");

            if (state != null)
                s += String.Format("State: {0}\r\n", state);
            else
                s += String.Format("State: unknown\r\n");

            return s;
        }
    }
}