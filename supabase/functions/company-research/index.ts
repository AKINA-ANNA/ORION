import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {

    // Handle browser CORS preflight request
    if (req.method === "OPTIONS") {

        return new Response(
            "ok",
            {
                headers: corsHeaders,
            }
        );

    }

    try {

        /*
        ==========================================
        GET API KEYS FROM SUPABASE SECRETS
        ==========================================
        */

        const TAVILY_API_KEY =
            Deno.env.get("TAVILY_API_KEY");

        const OPENROUTER_API_KEY =
            Deno.env.get("OPENROUTER_API_KEY");


        if (!TAVILY_API_KEY) {

            throw new Error(
                "TAVILY_API_KEY is not configured."
            );

        }


        if (!OPENROUTER_API_KEY) {

            throw new Error(
                "OPENROUTER_API_KEY is not configured."
            );

        }


        /*
        ==========================================
        GET COMPANY NAME FROM FRONTEND
        ==========================================
        */

        const body =
            await req.json();


        const companyName =
            body.company_name;


        if (
            !companyName ||
            typeof companyName !== "string"
        ) {

            return new Response(

                JSON.stringify({
                    error:
                        "Company name is required."
                }),

                {
                    status: 400,

                    headers: {
                        ...corsHeaders,
                        "Content-Type":
                            "application/json",
                    },
                }

            );

        }


        /*
        ==========================================
        TAVILY WEB SEARCH
        ==========================================
        */

        const tavilyResponse =
            await fetch(
                "https://api.tavily.com/search",
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                    },

                    body:
                        JSON.stringify({

                            api_key:
                                TAVILY_API_KEY,

                            query:
                                `"${companyName}" company official website products services about`,

                            search_depth:
                                "advanced",

                            max_results:
                                8,

                            include_answer:
                                true,

                            include_raw_content:
                                false,

                        }),

                }
            );


        if (
            !tavilyResponse.ok
        ) {

            const errorText =
                await tavilyResponse.text();


            console.error(
                "TAVILY ERROR:",
                errorText
            );


            throw new Error(
                "Failed to research the company."
            );

        }


        const tavilyData =
            await tavilyResponse.json();


        /*
        ==========================================
        PREPARE SEARCH RESULTS
        ==========================================
        */

        const searchResults =
            tavilyData.results
                ?.map(
                    (result: any) => ({

                        title:
                            result.title,

                        url:
                            result.url,

                        content:
                            result.content,

                    })
                ) || [];


        /*
        ==========================================
        OPENROUTER AI ANALYSIS
        ==========================================
        */

        const profilePrompt = `

You are Orion AI.

You are researching a company for an employee
onboarding platform.

The company name is:

${companyName}

You have been given publicly available web
search results about this company.

Your job is to create a preliminary company
profile based ONLY on information supported by
the search results.

IMPORTANT:

- Do not invent information.
- Do not assume information that is not supported.
- Prefer the company's official website and
  reliable sources.
- If information is uncertain, mark it as uncertain.
- The company will review your research before
  it becomes their official profile.
- The goal is to minimize questions asked to
  the company.

Return ONLY valid JSON.

Use exactly this structure:

{
    "company_name": "${companyName}",
    "industry": {
        "value": "",
        "confidence": "high"
    },
    "company_description": {
        "value": "",
        "confidence": "high"
    },
    "products_services": {
        "value": [],
        "confidence": "high"
    },
    "departments": {
        "value": [],
        "confidence": "low"
    },
    "technologies": {
        "value": [],
        "confidence": "low"
    },
    "onboarding_focus": {
        "value": "",
        "confidence": "low"
    },
    "missing_information": [],
    "sources": []
}

CONFIDENCE VALUES:

"high"
"medium"
"low"

IMPORTANT:

Only include departments, technologies,
or onboarding information if there is actual
evidence for them.

If information is not available, leave it
empty and add the field to missing_information.

For sources, include the URLs that were actually
used to support the profile.

SEARCH RESULTS:

${JSON.stringify(
    searchResults,
    null,
    2
)}

`;


        const openRouterResponse =
            await fetch(
                "https://openrouter.ai/api/v1/chat/completions",
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${OPENROUTER_API_KEY}`,

                        "HTTP-Referer":
                            "https://orion.local",

                        "X-Title":
                            "Orion Company Research",

                    },

                    body:
                        JSON.stringify({

                            model:
                                "openai/gpt-4o-mini",

                            messages: [

                                {

                                    role:
                                        "system",

                                    content:
                                        profilePrompt,

                                },

                            ],

                            temperature:
                                0.2,

                        }),

                }
            );


        if (
            !openRouterResponse.ok
        ) {

            const errorText =
                await openRouterResponse.text();


            console.error(
                "OPENROUTER ERROR:",
                errorText
            );


            throw new Error(
                "AI company analysis failed."
            );

        }


        const openRouterData =
            await openRouterResponse.json();


        /*
        ==========================================
        GET AI RESPONSE
        ==========================================
        */

        const aiContent =
            openRouterData
                ?.choices
                ?.[0]
                ?.message
                ?.content;


        if (!aiContent) {

            throw new Error(
                "AI returned no company profile."
            );

        }


        /*
        ==========================================
        CLEAN JSON
        ==========================================
        */

        let cleanJSON =
            aiContent
                .trim()
                .replace(
                    /^```json\s*/i,
                    ""
                )
                .replace(
                    /^```\s*/i,
                    ""
                )
                .replace(
                    /\s*```$/i,
                    ""
                )
                .trim();


        let profile;


        try {

            profile =
                JSON.parse(
                    cleanJSON
                );

        } catch (error) {

            console.error(
                "INVALID AI JSON:",
                aiContent
            );

            throw new Error(
                "AI returned invalid profile data."
            );

        }


        /*
        ==========================================
        RETURN PROFILE TO FRONTEND
        ==========================================
        */

        return new Response(

            JSON.stringify({

                success:
                    true,

                profile:
                    profile,

                search_results:
                    searchResults,

            }),

            {

                status:
                    200,

                headers: {

                    ...corsHeaders,

                    "Content-Type":
                        "application/json",

                },

            }

        );


    } catch (error) {

        console.error(
            "COMPANY RESEARCH ERROR:",
            error
        );


        return new Response(

            JSON.stringify({

                success:
                    false,

                error:
                    error.message ||
                    "Something went wrong."

            }),

            {

                status:
                    500,

                headers: {

                    ...corsHeaders,

                    "Content-Type":
                        "application/json",

                },

            }

        );

    }

});