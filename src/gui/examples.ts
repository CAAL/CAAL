var examples : any[] = [
    {
        title: "Peterson's Algorithm",
        ccs: "* Peterson's algorithm for mutual exclusion.\n" +
             "* See Chapter 7 of \"Reactive Systems\" for a full description.\n" +
             "\n" +
             "B1f = 'b1rf.B1f + b1wf.B1f + b1wt.B1t;\n" +
             "B1t = 'b1rt.B1t + b1wf.B1f + b1wt.B1t;\n" +
             "\n" +
             "B2f = 'b2rf.B2f + b2wf.B2f + b2wt.B2t;\n" +
             "B2t = 'b2rt.B2t + b2wf.B2f + b2wt.B2t;\n" +
             "\n" +
             "K1 = 'kr1.K1 + kw1.K1 + kw2.K2;\n" +
             "K2 = 'kr2.K2 + kw1.K1 + kw2.K2;\n" +
             "\n" +
             "P1 = 'b1wt.'kw2.P11;\n" +
             "P11 = b2rf.P12 + b2rt.(kr2.P11 + kr1.P12);\n" +
             "P12 = enter1.exit1.'b1wf.P1;\n" +
             "\n" +
             "P2 = 'b2wt.'kw1.P21;\n" +
             "P21 = b1rf.P22 + b1rt.(kr1.P21 + kr2.P22);\n" +
             "P22 = enter2.exit2.'b2wf.P2;\n" +
             "\n" +
             "set L = {b1rf, b2rf, b1rt, b2rt, b1wf, b2wf, b1wt, b2wt, kr1, kr2, kw1, kw2};\n" +
             "Peterson = (P1 | P2 | B1f | B2f | K1) \\ L;\n" +
             "\n" +
             "Spec = enter1.exit1.Spec + enter2.exit2.Spec;",

        properties: [
            {
                className: "TraceEquivalence",
                status: 3,
                options: {
                    type: "weak",
                    firstProcess: "Peterson",
                    secondProcess: "Spec"
                }
            },
            {
                className: "Bisimulation",
                status: 3,
                options: {
                    type: "weak",
                    firstProcess: "Peterson",
                    secondProcess:"Spec"
                }
            }
        ],
        inputMode: "CCS"
    },
    {
        title: "Orchard",
        ccs: "Man = 'shake.(redapple.walk.Man + greenapple.walk.Man);\n" +
             "\n" + 
             "AppleTree = shake.('greenapple.AppleTree + 'redapple.AppleTree);\n" +
             "\n" +
             "Orchard = (AppleTree | Man) \\ {shake, redapple, greenapple};\n" +
             "\n" +
             "Spec = walk.Spec;",   
        properties:[
            {
                className: "Bisimulation",
                status: 3,
                options: {
                    type: "strong",
                    firstProcess:"Orchard",
                    secondProcess:"Spec"
                }
            },
            {   
                className: "Bisimulation",
                status: 3,
                options: {
                    type: "weak",
                    firstProcess:"Orchard",
                    secondProcess:"Spec"
                }
            }
        ],
        inputMode: "CCS"
    },  
    {
        title: "Lecture Example",
        ccs: "Send = acc.Sending;\n" +
             "Sending = 'send.Wait;\n" + 
             "Wait = ack.Send + error.Sending;\n" +
             "\n" +
             "Rec = trans.Del;\n" +
             "Del = 'del.Ack;\n" +
             "Ack = 'ack.Rec;\n" +
             "\n" +
             "Med = send.Med';\n" + 
             "Med' = (tau.Err + 'trans.Med);\n" +
             "Err = 'error.Med;\n" + 
             "\n" +
             "set L = {send, trans, ack, error};\n" + 
             "\n" + 
             "Impl = (Send | Med |Rec) \\ L;\n" +
             "Spec = acc.'del.Spec;",
        properties:[],
        inputMode: "CCS"
    },
    {
        title: "Simple Communications Protocol",
        ccs: [
            "Send = acc.Sending;",
            "Sending = 'send.Wait;",
            "Wait = ack.Send + error.Sending + 'send.Wait;",
            "",
            "Rec = trans.Del;",
            "Del = 'del.Ack;",
            "Ack = 'ack.Rec;",
            "",
            "Med = send.Med';",
            "Med' = 'trans.Med + tau.Err + tau.Med;",
            "Err = 'error.Med;",
            "",
            "set L = {send, trans, ack, error};",
            "Impl = (Send | Med | Rec) \\ L;",
            "",
            "* This implementation is not weakly bisimilar with Spec",
            "* Fix the protocol such it is",
            "",
            "Spec = acc.'del.Spec;"
        ].join("\n"),
        properties: [
            {
                className: "Bisimulation",
                status: 3,
                options: {
                    type: "weak",
                    firstProcess: "Impl",
                    secondProcess: "Spec"
                }
            },
            {
                className: "TraceEquivalence",
                status: 3,
                options: {
                    type: "weak",
                    firstProcess: "Impl",
                    secondProcess: "Spec"
                }
            },
            {
                className: "HML",
                status: 3,
                options: {
                    process: "Impl",
                    topFormula: "X;",
                    definitions: "X min= [-]ff or <->X;",
                    comment: ""
                }
            }
        ],
        inputMode: "CCS"
    },
    {
        title: "Lightswitch",
        ccs: "Off = press.Light;\n" +
             "Bright = press.Off;\n" +
             "Light = 2.tau.press.Off + press.Bright;\n\n" +
             "FastUser = 'press.1.'press.FastUser;\n" +
             "SlowUser = 'press.3.'press.SlowUser;\n\n" +
             "Lightswitch = (FastUser | Off) \\ {press};",
        properties:[],
        inputMode: "TCCS"
    },
    {
        title: "Airbag",
        ccs: "Driver = drive.Driver + drive.Crash;\n"+
             "Crash  = 'crash.(inflate.Driver + 2.tau.0);\n\n"+
             "GoodAirbag = crash.1.'inflate.GoodAirbag;\n"+
             "BadAirbag  = crash.3.'inflate.BadAirbag;\n\n"+
             "Impl = (Driver | GoodAirbag) \\ {crash, inflate};\n"+
             "Spec = drive.Spec;",
        properties:[],
        inputMode: "TCCS"
    }
]
