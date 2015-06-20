var examples : any[] = [
    {
        title: "Peterson's Algorithm",
        ccs: [
            "* Peterson's algorithm for mutual exclusion.",
            "* See Chapter 7 of \"Reactive Systems\" for a full description.",
            "",
            "B1f = 'b1rf.B1f + b1wf.B1f + b1wt.B1t;",
            "B1t = 'b1rt.B1t + b1wf.B1f + b1wt.B1t;",
            "",
            "B2f = 'b2rf.B2f + b2wf.B2f + b2wt.B2t;",
            "B2t = 'b2rt.B2t + b2wf.B2f + b2wt.B2t;",
            "",
            "K1 = 'kr1.K1 + kw1.K1 + kw2.K2;",
            "K2 = 'kr2.K2 + kw1.K1 + kw2.K2;",
            "",
            "P1 = 'b1wt.'kw2.P11;",
            "P11 = b2rf.P12 + b2rt.(kr2.P11 + kr1.P12);",
            "P12 = enter1.exit1.'b1wf.P1;",
            "",
            "P2 = 'b2wt.'kw1.P21;",
            "P21 = b1rf.P22 + b1rt.(kr1.P21 + kr2.P22);",
            "P22 = enter2.exit2.'b2wf.P2;",
            "",
            "set L = {b1rf, b2rf, b1rt, b2rt, b1wf, b2wf, b1wt, b2wt, kr1, kr2, kw1, kw2};",
            "Peterson = (P1 | P2 | B1f | B2f | K1) \\ L;",
            "",
            "Spec = enter1.exit1.Spec + enter2.exit2.Spec;",
        ].join("\n"),
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
        ccs: [
            "Man = 'shake.(redapple.walk.Man + greenapple.walk.Man);",
            "",
            "AppleTree = shake.('greenapple.AppleTree + 'redapple.AppleTree);",
            "",
            "Orchard = (AppleTree | Man) \\ {shake, redapple, greenapple};",
            "",
            "Spec = walk.Spec;",
        ].join("\n"),
        properties:[
            {
                className: "Bisimulation",
                status: 3,
                options: {
                    type: "strong",
                    firstProcess: "Orchard",
                    secondProcess: "Spec"
                }
            },
            {   
                className: "Bisimulation",
                status: 3,
                options: {
                    type: "weak",
                    firstProcess: "Orchard",
                    secondProcess: "Spec"
                }
            }
        ],
        inputMode: "CCS"
    },
    {
        title: "Simple Communication Protocol",
        ccs: [
            "* The implementation and specification given below are not weakly bisimilar.",
            "* See if you can correct the implementation such that it is weakly bisimilar to its specification.",
            "",
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
                    comment: "Reachable deadlock."
                }
            },
            {
                className: "HML",
                status: 3,
                options: {
                    process: "Impl",
                    topFormula: "Y;",
                    definitions: "Y min= Z or <->Y; Z max= <tau>Z;",
                    comment: "Reachable livelock."
                }
            }
        ],
        inputMode: "CCS"
    },
    {
        title: "Lightswitch",
        ccs: [
            "Off = press.Light;",
            "Bright = press.Off;",
            "Light = 2.tau.press.Off + press.Bright;",
            "",
            "FastUser = 'press.1.'press.FastUser;",
            "SlowUser = 'press.3.'press.SlowUser;",
            "",
            "Lightswitch = (FastUser | Off) \\ {press};"
        ].join("\n"),
        properties: [],
        inputMode: "TCCS"
    },
    {
        title: "Airbag",
        ccs: [
            "Driver = drive.Driver + drive.Crash;",
            "Crash  = 'crash.(inflate.Driver + 2.tau.0);",
            "",
            "GoodAirbag = crash.1.'inflate.GoodAirbag;",
            "BadAirbag  = crash.3.'inflate.BadAirbag;",
            "",
            "Impl = (Driver | GoodAirbag) \\ {crash, inflate};",
            "Spec = drive.Spec;",
        ].join("\n"),
        properties: [],
        inputMode: "TCCS"
    },
    {
        title: "Timed Communication Protocol",
        ccs: [
            "Send = acc.2.'send.1.ack.2.Send;",
            "Rec = trans.1.'del.2.'ack.8.Rec;",
            "Med = send.(3.'trans.Med + 5.tau.Med);",
            "",
            "Impl = (Send | Med | Rec) \\ {send, trans, ack};",
            "Spec = acc.'del.Spec;",
        ].join("\n"),
        properties: [
            {   
                className: "Bisimulation",
                status: 3,
                options: {
                    type: "weak",
                    time: "untimed",
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
                    definitions: "X max= [acc]<<0,6>><'del>tt and [-]X;",
                    comment: "When acc is performed the message can be delivered within 6 time units."
                }
            },
            {
                className: "HML",
                status: 3,
                options: {
                    process: "Impl",
                    topFormula: "X;",
                    definitions: "X max= [acc]<<0,7>><'del>tt and [-]X;",
                    comment: "When acc is performed the message can be delivered within 7 time units."
                }
            }
        ],
        inputMode: "TCCS"
    }
]
