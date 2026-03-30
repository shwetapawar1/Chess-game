import { useEffect } from "react";
import { useState } from "react";
import { api } from "../api/client"
import {useSelector} from "react-redux"


export const Leaderboard = () => {

const [data, setData] = useState([]);
const user = useSelector(state => state.auth.user);

useEffect(() => {
    async function loadData() {
       try{
        const res = await api.get("/leaderboard");
        console.log(res.data);
        setData(res.data);
       }catch(err){
        console.log(err.message);
       } 
    }
    loadData();
}, []);


   return (
   <div>
    <h1 className="text-3xl">Leaderboard </h1>

    <table>
        <thead>
            <tr>
                <th>No.</th>
                <th>Name</th>
                <th>Wins</th>
                <th>Losses</th>
                <th>Games Played</th>
                <th>Streak</th>
            </tr>
        </thead>
        <tbody>
            {data.map((u) => (
                <tr
                className={
                    user._id.toString() === u._id.toString() ? "bg-orange-300" : ""
                }>
                    <td>{u.rank}</td>
                     <td>{u.name}</td>
                      <td>{u.stats.wins}</td>
                       <td>{u.stats.losses}</td>
                        <td>{u.stats.gamesPlayed}</td>
                         <td>{u.stats.currentStreak}</td>
                </tr>

            ))}
        </tbody>
    </table>
        </div> 
        );

};