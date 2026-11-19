export type FlooringOrderResult={quantity:number;area:number;waste:number;coverage:number;coveredArea:number}|{error:string};
export function flooringOrderQuantity(input:{unit:unknown;coverage:unknown;area:unknown;waste:unknown}):FlooringOrderResult{
 if([input.coverage,input.area,input.waste].some(value=>value!==null&&value!==undefined&&typeof value!=="number"&&typeof value!=="string"))return {error:"Coverage, area and waste must be numeric values."};
 if(!["pack","box"].includes(String(input.unit||"").trim().toLowerCase()))return {error:"Area calculation requires a product sold by pack or box."};
 const coverage=Number(input.coverage);
 if(input.coverage===null||input.coverage===undefined||String(input.coverage).trim()===""||!Number.isFinite(coverage)||coverage<=0||coverage>100000)return {error:"Save a valid square-metre coverage per pack or box in Price Book first."};
 if(input.area===null||input.area===undefined||String(input.area).trim()==="")return {error:"Enter the required area in square metres."};
 const area=Number(input.area);
 if(!Number.isFinite(area)||area<=0||area>100000)return {error:"Area must be greater than zero and no more than 100,000 m²."};
 if(input.waste===null||input.waste===undefined||String(input.waste).trim()==="")return {error:"Enter the waste percentage explicitly. Use 0 if no waste is required."};
 const waste=Number(input.waste);
 if(!Number.isFinite(waste)||waste<0||waste>100)return {error:"Waste must be between 0 and 100%."};
 // Use decimal arithmetic for the round-up boundary, matching PostgreSQL numeric.
 // Binary floats can turn an exact pack multiple into one extra pack.
 const fraction=(value:number)=>{const [coefficient,exponentText]=String(value).toLowerCase().split("e");const [whole,decimal=""]=coefficient.split(".");const exponent=Number(exponentText||0)-decimal.length;const digits=BigInt(whole+decimal);return exponent>=0?{n:digits*BigInt(10)**BigInt(exponent),d:BigInt(1)}:{n:digits,d:BigInt(10)**BigInt(-exponent)};};
 const a=fraction(area),w=fraction(waste),c=fraction(coverage);
 const numerator=a.n*(BigInt(100)*w.d+w.n)*c.d,denominator=a.d*BigInt(100)*w.d*c.n;
 const quantity=Number((numerator+denominator-BigInt(1))/denominator);
 if(!Number.isFinite(quantity)||quantity<=0||quantity>1000000)return {error:"Calculated quantity exceeds the supported order limit."};
 return {quantity,area,waste,coverage,coveredArea:quantity*coverage};
}
