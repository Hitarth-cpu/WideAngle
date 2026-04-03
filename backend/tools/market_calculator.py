from backend.agents.base import Tool


class MarketCalculatorTool:
    """Structured TAM/SAM/SOM calculator for market sizing."""
    name = "calculate_market_size"
    description = (
        "Calculate market size estimates. "
        "Usage: TOOL: calculate_market_size(industry=\"SaaS\", geography=\"US\", assumptions=\"B2B SMB focus\")"
    )

    async def execute(
        self,
        industry: str = "unknown",
        geography: str = "global",
        assumptions: str = "",
    ) -> str:
        return (
            f"Market Size Framework for {industry} in {geography}:\n\n"
            f"TAM (Total Addressable Market):\n"
            f"  - All potential buyers of this type of solution worldwide\n"
            f"  - Typical range for {industry}: $1B - $500B depending on definition breadth\n\n"
            f"SAM (Serviceable Addressable Market):\n"
            f"  - Subset reachable with your go-to-market (geography, segment, channel)\n"
            f"  - For {geography}, typically 10-30% of TAM\n\n"
            f"SOM (Serviceable Obtainable Market):\n"
            f"  - Realistic capture in 3-5 years given competition and resources\n"
            f"  - Conservative: 1-5% of SAM for early-stage companies\n\n"
            f"Assumptions applied: {assumptions or 'none specified'}\n\n"
            f"Note: These are framework estimates. Validate with industry reports (Gartner, IDC, CB Insights)."
        )
