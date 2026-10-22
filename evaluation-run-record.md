### Evaluation Run Record 
Each participant should complete one Evaluation Run Record per harness/model run. 

| Field | Value |
| --- | --- |
| Team | Cursor |
| Developer / Operator | Jason Morais |
| Reviewer | (leave blank for now) |
| Harness | Cursor |
| Model | Grok 4.7 |
| License / Plan | Teams Premium |
| Codebase | ECFMG/axc |
| Task Set | B |
| Run Type | Harness Engineering Iteration 2 |
| Harness Engineering Used | Generator, Custom Lint, Cursor Hooks, Write Permissions  |
| Config / Diff Notes | |
| Branch / Commit | jjm-cur-2-b-out |
| Requirements Completed / Attempted | All |
| Acceptance Criteria Passed / Total | All |
| Tests Passed / Failed | All |
| Static Analysis / Security Findings | Didnt run |
| Input Tokens | NA |
| Cached Tokens | NA |
| Output Tokens |NA |
| Total Tokens or Credits Used | 14.1M |
| Estimated Cost |NA |
| Elapsed Time |23.36 mins |
| Number of Human Interventions / Redirects | 0 |
| Reviewer Notes | Frank and Jason Review |
| Final Rubric Score | 65 |
| Recommendation | Continue / Remediate / Stop / Candidate for Pilot |


4 - does function as intended, some refinment could be done
3 - Test additions were good for regular testing and serenity, but verify didnt pass, so questionable gaps there
3 - overall generator pattern and custom linting worked very well,but im not completely happy with how it handled some edges around it. Although it started doing a bad pattern for the rest area that got messy - would like to work on cleaning that up.
2 - Verify didnt pass so i cant be a good judge for snyk, as it got stuck on knip, so while not abysmal, clearly lacking in this part. But the session pattern and restricted cursor access went well.
4 - I think in terms of this being an improvement, this provided vastly better results following our patterns, and took less time overall, still refinement and additions to be done, but a big amount of the overall effort was done here. But I could still improve the overall rest area more.
3 - Its slightly more efficient but was not a main focus of this effort, time wise its probablt close to where it should be though.
4 - Generator is a perfect fit, linting needs some more work but should be a good fit, cursor permission hooks and session need some refinement later on.
3 - While the tool could be used, the limitations around model selection are much greater, as the grok models while good are very limited in terms of selection, and outside model usage is wayyyyy lower.