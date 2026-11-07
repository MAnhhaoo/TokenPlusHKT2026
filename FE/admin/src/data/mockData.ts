import type { FloodReport, AreaAlert, CommunityUser, MapPoint, WeatherSnapshot, TrendsMap } from "@/types"
const locations = ["Nguyễn Hữu Cảnh", "Quốc Hương", "Huỳnh Tấn Phát", "Nguyễn Văn Quá", "Trần Xuân Soạn", "Nguyễn Văn Linh", "Xô Viết Nghệ Tĩnh", "Lương Định Của"]
const districts = ["Bình Thạnh", "TP. Thủ Đức", "Quận 7", "Quận 12", "Quận 7", "Bình Chánh", "Bình Thạnh", "TP. Thủ Đức"]
export const mockReports: FloodReport[] = locations.map((location, i) => ({
 id: `RP-${101+i}`, location, district: districts[i], reportedAt: `18:${String(42-i*3).padStart(2,"0")}`, minutesAgo: i<5 ? 7+i*3 : [1800,4700,12000][i-5],
 description: "Dữ liệu mô phỏng: nước ngập cục bộ trên mặt đường, phương tiện di chuyển chậm. Cần kiểm tra tình trạng thoát nước.",
 reportedDepth: 20+i*4, aiDepth: 22+i*3, aiConfidence: 88+i, severity: i%3 === 0 ? "critical" : i%3 === 1 ? "high" : "medium",
 status: i<4 ? "pending" : i<7 ? "verified" : "rejected", priority: i%3 === 0 ? "Khẩn cấp" : "Bình thường",
 coordinates: `${(10.72+i*0.012).toFixed(4)}, ${(106.65+i*0.009).toFixed(4)}`, historyCount: i+2, visual: (["street","drain","night","traffic"] as const)[i%4], reporterId: `USR-${i%4+1}`,
}))
export const mockPoints: MapPoint[] = [
 ...mockReports.filter(r=>r.status!=="rejected").map((r,i): MapPoint => ({id:`p${i+1}`,x:23+i*8,y:28+(i%3)*19,type:r.status==="pending"?"pending":"flood",severity:r.severity,label:r.location,district:r.district,rainfall:28+i*2,depth:r.aiDepth,historyCount:r.historyCount,linkedReportId:r.id})),
 {id:"risk1",x:76,y:31,type:"risk",severity:"high",label:"Vùng trũng Thảo Điền",district:"TP. Thủ Đức",rainfall:35,depth:0,historyCount:12,elevationM:1.8},
 {id:"sensor1",x:31,y:70,type:"sensor",severity:"medium",label:"Trạm mưa Quận 7",district:"Quận 7",rainfall:32,depth:0,historyCount:0},
 {id:"history1",x:68,y:71,type:"history",severity:"critical",label:"Điểm ngập lịch sử",district:"Bình Thạnh",rainfall:0,depth:50,maxDepth:65,historyCount:18,elevationM:2},
]
export const mockAlerts: AreaAlert[] = [0,1,2].map((i)=>({id:`AL-${191+i}`,area:["Nguyễn Hữu Cảnh, Bình Thạnh","Thảo Điền, TP. Thủ Đức","Huỳnh Tấn Phát, Quận 7"][i],level:i===0?"Nghiêm trọng":"Cảnh báo",hazardType:"Ngập đường",title:"Hạn chế di chuyển qua khu vực ngập",message:"Cảnh báo mô phỏng: chọn tuyến đường khác và theo dõi hướng dẫn an toàn.",startedAt:"18:30",expiresAt:"21:00",status:i===2?"ended":"active",channels:["Web","Push"],createdBy:"Nguyễn Minh"}))
export const mockUsers: CommunityUser[] = ["Nguyễn An","Trần Bình","Lê Chi","Phạm Dũng"].map((name,i)=>({id:`USR-${i+1}`,name,initials:["NA","TB","LC","PD"][i],phone:`090000000${i}`,email:`demo${i+1}@example.test`,district:districts[i],joinedAt:"01/11/2026",lastActive:"7 phút trước",reports:2,verifiedReports:1,rejectedReports:0,trustScore:95-i*13,status:i===3?"review":"active",identityVerified:i<2,warnings:i===3?1:0}))
export const mockWeather: WeatherSnapshot = {provider:"Mô phỏng",locationName:"TP. Hồ Chí Minh",temperatureC:27,humidityPercent:88,windSpeedKmh:14,currentRainMm:32,weatherCondition:"Mưa lớn",floodRiskLevel:"Cao"}
export const mockTrends: TrendsMap = {
 "24h": {labels:["00h","04h","08h","12h","16h","20h"],reports:[1,0,2,1,3,1],rain:[4,2,8,12,32,24],insight:"Mô phỏng: báo cáo tăng trong khung giờ mưa chiều."},
 "7d": {labels:["T2","T3","T4","T5","T6","T7","CN"],reports:[2,4,3,6,5,8,4],rain:[10,15,8,22,18,32,16],insight:"Mô phỏng: lượng mưa và báo cáo biến động trong tuần."},
 "30d": {labels:["01–05","06–10","11–15","16–20","21–25","26–30"],reports:[12,18,10,24,16,20],rain:[35,48,22,65,42,54],insight:"Mô phỏng: theo dõi xu hướng theo từng nhóm ngày."},
}
