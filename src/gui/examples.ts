var examples = [
    {
        title: "Peterson's Algorithm",
        ccs: "* Peterson's algorithm for mutual exclusion.\n" +
             "* See chapter 7 of \"Reactive Systems\" for a full description.\n" +
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
                options: {
                    process: "Peterson",
                    formula: "X max= ([exit1]ff or [exit2]ff) and [-]X;"
                }
            }
        ]
    }
]
