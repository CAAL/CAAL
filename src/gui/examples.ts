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
             "set L = {b1rf, b2rf, b1rt, b2rt, b1wf, b2wf, b1wt, b2wt, kr1, kr2, kw1, kw2, enter1, enter2, exit1, exit2};\n" +
             "Peterson = (P1 | P2 | B1f | B2f | K1) \\ L;",
        properties: [
            {
                type: "HML",
                status: 3,
                options: {
                    process: "Peterson",
                    formula: "X max= ([exit1]ff or [exit2]ff) and [-]X;"
                }
            }
        ]
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
                type: "StrongBisimulation",
                status: 3,
                options: {
                    firstProcess:"Orchard",
                    secondProcess:"Spec"
                }
            },
            {   
                type: "WeakBisimulation",
                status: 3,
                options: {
                    firstProcess:"Orchard",
                    secondProcess:"Spec"
                }
            }
        ]
    },
    {
        title: "Exercise 3.1",
        ccs: "S = a.S1 + a.S2;\n" +
             "S1 = a.S3 + b.S4;\n" + 
             "S2 = a.S4;\n" +
             "S3 = a.S;\n" +
             "S4 = a.S;\n" +
             "\n" +
             "T = a.T1 + a.T3;\n" +
             "T1 = a.T2 + b.T2;\n" +
             "T2 = a.T;\n" +
             "T3 = a.T4;\n" +
             "T4 = a.T;",   
        properties:[]
    },
        
    {
        title: "Exercise 3.2",
        ccs: "P = a.P1;\n" +
             "P1 = b.P + c.P;\n" + 
             "\n" +
             "Q = a.Q1;\n" +
             "Q1 = b.Q2 + c.Q;\n" +
             "Q2 = a.Q3;\n" +
             "Q3 = b.Q + c.Q2;",    
        properties:[]
    },
    {
        title: "Exercise 4.1",
        ccs: "S = tau.S1 + a.S3;\n" +
             "S1 = tau.S2 + b.S4 + tau.S;\n" + 
             "S2 = tau.S1 + tau.S5;\n" +
             "S3 = 0;\n" +
             "S4 = 0;\n" +
             "S5 = 0;\n" +
             "\n" +
             "T = tau.T1 + a.T2 + b.T3;\n" +
             "T1 = tau.T1;\n" +
             "T2 = 0;\n" +
             "T3 = 0;",
        properties:[]
    },
    {
        title: "Exercise 5.1",
        ccs: "S = a.S1 + a.S2;\n" +
             "S1 = a.S3 + a.S4;\n" + 
             "S2 = a.S4;\n" +
             "S3 = a.S;\n" +
             "S4 = a.S;",   
        properties:[]
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
        properties:[]
    },
]
